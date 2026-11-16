/**
 * Bounded checking for class access after checkout.
 *
 * The success page asks the server again (a refresh) on a short, slowing
 * schedule: quickly at first, since the signed webhook usually lands within
 * seconds, then less often. Checking stops for good once the window passes,
 * measured by the wall clock, so a tab that was suspended or throttled and
 * wakes up later does not resume asking. Only one refresh is in flight at a
 * time: the next one is scheduled after the caller reports the previous one
 * settled. A tick that lands while the tab is hidden is skipped, not sent.
 */

/**
 * Gaps between checks, in milliseconds: eight checks over 55 seconds, which
 * leaves the last one time to settle inside the one-minute window.
 */
export const ACCESS_CHECK_DELAYS_MS: readonly number[] = [2000, 3000, 5000, 5000, 10000, 10000, 10000, 10000];
export const ACCESS_CHECK_WINDOW_MS = 60_000;

export type AccessPoller = {
  /** The refresh the poller last started has finished; schedule the next. */
  refreshSettled(): void;
  /** Cancel every timer. Safe to call more than once. */
  stop(): void;
};

export function startAccessPolling({
  refresh,
  onExpire,
  isHidden = () => false,
  now = Date.now,
  delays = ACCESS_CHECK_DELAYS_MS,
  windowMs = ACCESS_CHECK_WINDOW_MS,
}: {
  refresh: () => void;
  onExpire: () => void;
  isHidden?: () => boolean;
  now?: () => number;
  delays?: readonly number[];
  windowMs?: number;
}): AccessPoller {
  const startedAt = now();
  let attempt = 0;
  let inFlight = false;
  let done = false;
  let tick: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;

  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(tick);
    clearTimeout(deadline);
    onExpire();
  };

  const schedule = () => {
    if (done) return;
    if (attempt >= delays.length || now() - startedAt >= windowMs) return finish();
    tick = setTimeout(() => {
      if (done) return;
      // A throttled or suspended timer can fire long after it was due.
      if (now() - startedAt >= windowMs) return finish();
      attempt += 1;
      if (isHidden()) return schedule();
      inFlight = true;
      refresh();
    }, delays[attempt]);
  };

  // Ends the window even if a refresh never reports back.
  deadline = setTimeout(finish, windowMs);
  schedule();

  return {
    refreshSettled() {
      if (!inFlight || done) return;
      inFlight = false;
      schedule();
    },
    stop() {
      done = true;
      clearTimeout(tick);
      clearTimeout(deadline);
    },
  };
}
