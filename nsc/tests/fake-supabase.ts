/**
 * Minimal in-memory stand-in for the supabase-js query builder, for unit
 * tests of server logic that takes its client as a parameter (webhook,
 * gift codes, assessment taps, engagement cron). It models the parts those
 * modules use: select/insert/upsert/update/delete, eq/is/in/not/gte/lt
 * filters, order/limit/range, single/maybeSingle, unique constraints
 * (Postgres 23505 on conflict), and injectable failures.
 *
 * Not a test file itself (no .test.ts suffix), so vitest never runs it.
 */

export type Row = Record<string, unknown>;
export interface FakeError {
  code?: string;
  message: string;
}
type Op = "select" | "insert" | "upsert" | "update" | "delete";

interface FailRule {
  table: string;
  op: Op;
  error: FakeError;
  remaining: number;
}

export interface FakeResult<T = unknown> {
  data: T | null;
  error: FakeError | null;
}

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export class FakeDb {
  private tables = new Map<string, Row[]>();
  private uniques = new Map<string, string[][]>();
  private failures: FailRule[] = [];
  private idCounter = 1;
  /** Every executed operation, for "was this written?" assertions. */
  readonly log: { table: string; op: Op; payload?: unknown }[] = [];

  constructor(opts: { uniques?: Record<string, string[][]> } = {}) {
    for (const [t, sets] of Object.entries(opts.uniques ?? {})) this.uniques.set(t, sets);
  }

  seed(table: string, rows: Row[]): this {
    this.rows(table).push(...clone(rows));
    return this;
  }

  rows(table: string): Row[] {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  /** Make the next `times` operations of `op` on `table` fail with `error`. */
  fail(table: string, op: Op, error: FakeError = { message: "boom" }, times = Infinity): this {
    this.failures.push({ table, op, error, remaining: times });
    return this;
  }

  from(table: string): FakeQuery {
    return new FakeQuery(this, table);
  }

  /** @internal */
  takeFailure(table: string, op: Op): FakeError | null {
    const rule = this.failures.find((f) => f.table === table && f.op === op && f.remaining > 0);
    if (!rule) return null;
    rule.remaining -= 1;
    return rule.error;
  }

  /** @internal */
  uniqueSets(table: string): string[][] {
    return this.uniques.get(table) ?? [];
  }

  /** @internal */
  newId(): string {
    return `id-${this.idCounter++}`;
  }
}

type Filter = (r: Row) => boolean;

export class FakeQuery implements PromiseLike<FakeResult> {
  private op: Op = "select";
  private filters: Filter[] = [];
  private payload: Row[] = [];
  private patch: Row = {};
  private onConflict: string[] = [];
  private ignoreDuplicates = false;
  private returning = false;
  private orders: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private rng: [number, number] | null = null;
  private mode: "many" | "single" | "maybe" = "many";

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(_cols?: string): this {
    if (this.op !== "select") this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]): this {
    this.op = "insert";
    this.payload = clone(Array.isArray(rows) ? rows : [rows]);
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}): this {
    this.op = "upsert";
    this.payload = clone(Array.isArray(rows) ? rows : [rows]);
    this.onConflict = (opts.onConflict ?? "id").split(",").map((s) => s.trim());
    this.ignoreDuplicates = Boolean(opts.ignoreDuplicates);
    return this;
  }
  update(patch: Row): this {
    this.op = "update";
    this.patch = clone(patch);
    return this;
  }
  delete(): this {
    this.op = "delete";
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  neq(col: string, val: unknown): this {
    this.filters.push((r) => r[col] !== val);
    return this;
  }
  is(col: string, val: unknown): this {
    this.filters.push((r) => (r[col] ?? null) === val);
    return this;
  }
  in(col: string, vals: unknown[]): this {
    this.filters.push((r) => vals.includes(r[col]));
    return this;
  }
  not(col: string, op: string, val: unknown): this {
    if (op === "is") this.filters.push((r) => (r[col] ?? null) !== val);
    else if (op === "eq") this.filters.push((r) => r[col] !== val);
    else throw new Error(`fake: unsupported not(${op})`);
    return this;
  }
  gte(col: string, val: string | number): this {
    this.filters.push((r) => (r[col] as string | number) >= val);
    return this;
  }
  lt(col: string, val: string | number): this {
    this.filters.push((r) => (r[col] as string | number) < val);
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}): this {
    this.orders.push({ col, asc: opts.ascending !== false });
    return this;
  }
  limit(n: number): this {
    this.lim = n;
    return this;
  }
  range(from: number, to: number): this {
    this.rng = [from, to];
    return this;
  }
  single(): this {
    this.mode = "single";
    return this;
  }
  maybeSingle(): this {
    this.mode = "maybe";
    return this;
  }

  then<A = FakeResult, B = never>(
    onfulfilled?: ((value: FakeResult) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.exec())
      .then(onfulfilled, onrejected);
  }

  private matches(r: Row): boolean {
    return this.filters.every((f) => f(r));
  }

  private shape(rows: Row[]): FakeResult {
    let out = rows;
    for (const { col, asc } of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => {
        const x = a[col] as string | number;
        const y = b[col] as string | number;
        if (x === y) return 0;
        return (x < y ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
    if (this.lim !== null) out = out.slice(0, this.lim);
    out = clone(out);
    if (this.mode === "single") {
      return out.length === 1
        ? { data: out[0], error: null }
        : { data: null, error: { code: "PGRST116", message: `expected 1 row, got ${out.length}` } };
    }
    if (this.mode === "maybe") {
      if (out.length > 1) return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
      return { data: out[0] ?? null, error: null };
    }
    return { data: out, error: null };
  }

  private conflictsWith(candidate: Row, existing: Row[], cols: string[]): Row | undefined {
    return existing.find((r) =>
      cols.every((c) => candidate[c] !== undefined && candidate[c] !== null && r[c] === candidate[c]),
    );
  }

  private violatesUnique(candidate: Row, existing: Row[]): boolean {
    return this.db
      .uniqueSets(this.table)
      .some((cols) => this.conflictsWith(candidate, existing, cols) !== undefined);
  }

  private exec(): FakeResult {
    const injected = this.db.takeFailure(this.table, this.op);
    this.db.log.push({ table: this.table, op: this.op, payload: this.op === "update" ? this.patch : this.payload });
    if (injected) return { data: null, error: injected };
    const rows = this.db.rows(this.table);

    switch (this.op) {
      case "select":
        return this.shape(rows.filter((r) => this.matches(r)));

      case "insert": {
        const added: Row[] = [];
        for (const p of this.payload) {
          const row = { id: this.db.newId(), ...p };
          if (this.violatesUnique(row, [...rows, ...added])) {
            return { data: null, error: { code: "23505", message: "duplicate key value" } };
          }
          added.push(row);
        }
        rows.push(...added);
        return this.returning ? this.shape(added) : { data: null, error: null };
      }

      case "upsert": {
        const touched: Row[] = [];
        for (const p of this.payload) {
          const hit = this.conflictsWith(p, rows, this.onConflict);
          if (hit) {
            if (!this.ignoreDuplicates) Object.assign(hit, p);
            touched.push(hit);
          } else {
            const row = { id: this.db.newId(), ...p };
            if (this.violatesUnique(row, rows)) {
              return { data: null, error: { code: "23505", message: "duplicate key value" } };
            }
            rows.push(row);
            touched.push(row);
          }
        }
        return this.returning ? this.shape(touched) : { data: null, error: null };
      }

      case "update": {
        const hit = rows.filter((r) => this.matches(r));
        for (const r of hit) Object.assign(r, clone(this.patch));
        return this.returning ? this.shape(hit) : { data: null, error: null };
      }

      case "delete": {
        const keep = rows.filter((r) => !this.matches(r));
        const gone = rows.filter((r) => this.matches(r));
        rows.length = 0;
        rows.push(...keep);
        return this.returning ? this.shape(gone) : { data: null, error: null };
      }
    }
  }
}
