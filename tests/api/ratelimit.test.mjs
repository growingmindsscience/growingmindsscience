import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  clientKey,
  createDailyAllowance,
  createWindowLimiter,
  ipKey,
} from "../../api/_ratelimit.js";

test("ipKey keeps IPv4 addresses whole", () => {
  assert.equal(ipKey("203.0.113.7"), "203.0.113.7");
  assert.equal(ipKey(" 203.0.113.7 "), "203.0.113.7");
  assert.equal(ipKey(""), "unknown");
  assert.equal(ipKey(undefined), "unknown");
});

test("ipKey counts IPv6 clients per /64", () => {
  const a = ipKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
  assert.equal(a, "2001:db8:1:2::/64");
  assert.equal(ipKey("2001:0db8:0001:0002::1"), a);
  assert.equal(ipKey("2001:DB8:1:2::ffff"), a);
  assert.equal(ipKey("[2001:db8:1:2::5]"), a);
  assert.equal(ipKey("2001:db8:1:2::5%eth0"), a);
  assert.notEqual(ipKey("2001:db8:1:3::1"), a);
  assert.equal(ipKey("::1"), "0:0:0:0::/64");
  assert.equal(ipKey("64:ff9b::192.0.2.1"), "64:ff9b:0:0::/64");
});

test("ipKey maps IPv4-mapped IPv6 to the IPv4 address and leaves junk as-is", () => {
  assert.equal(ipKey("::ffff:192.0.2.9"), "192.0.2.9");
  assert.equal(ipKey("not-an-ip"), "not-an-ip");
  assert.equal(ipKey("2001:db8:::1"), "2001:db8:::1");
});

test("clientKey reads the first x-forwarded-for hop", () => {
  const req = new Request("https://example.test/", { headers: { "x-forwarded-for": "2001:db8:9:9::1, 10.0.0.1" } });
  assert.equal(clientKey(req), "2001:db8:9:9::/64");
});

test("window limiter: counts, limits, resets after the window", () => {
  let now = 1_000_000;
  const limiter = createWindowLimiter({ limit: 3, windowMs: 60_000, now: () => now });
  assert.equal(limiter.hit("k").limited, false);
  assert.equal(limiter.hit("k").limited, false);
  assert.equal(limiter.check("k").limited, false);
  assert.equal(limiter.hit("k").limited, false);
  assert.equal(limiter.check("k").limited, true, "check() reports a used-up budget");
  const over = limiter.hit("k");
  assert.equal(over.limited, true);
  assert.ok(over.retryAfter >= 1 && over.retryAfter <= 60);
  assert.equal(limiter.hit("other").limited, false, "keys are independent");
  now += 60_000;
  assert.equal(limiter.hit("k").limited, false, "a new window starts fresh");
});

test("window limiter: check() does not count a hit", () => {
  const limiter = createWindowLimiter({ limit: 1, windowMs: 60_000 });
  for (let i = 0; i < 5; i += 1) assert.equal(limiter.check("k").limited, false);
  assert.equal(limiter.hit("k").limited, false);
  assert.equal(limiter.hit("k").limited, true);
});

test("window limiter stays bounded under a flood of new keys", () => {
  const limiter = createWindowLimiter({ limit: 5, windowMs: 60_000, maxKeys: 100 });
  for (let i = 0; i < 5000; i += 1) limiter.hit(`key-${i}`);
  assert.ok(limiter.size() <= 100, `size ${limiter.size()}`);
});

test("daily allowance: reserve up to the limit, refund gives one back", () => {
  const allowance = createDailyAllowance({ limit: 2 });
  assert.equal(allowance.reserve("k"), true);
  assert.equal(allowance.reserve("k"), true);
  assert.equal(allowance.reserve("k"), false);
  assert.equal(allowance.remaining("k"), 0);
  allowance.refund("k");
  assert.equal(allowance.remaining("k"), 1);
  assert.equal(allowance.reserve("k"), true);
  assert.equal(allowance.reserve("k"), false);
});

test("daily allowance resets on a new UTC day and stays bounded", () => {
  let now = Date.UTC(2026, 8, 28, 23, 59);
  const allowance = createDailyAllowance({ limit: 1, maxKeys: 50, now: () => now });
  assert.equal(allowance.reserve("k"), true);
  assert.equal(allowance.reserve("k"), false);
  now = Date.UTC(2026, 8, 29, 0, 1);
  assert.equal(allowance.reserve("k"), true);
  for (let i = 0; i < 2000; i += 1) allowance.reserve(`key-${i}`);
  assert.ok(allowance.size() <= 50, `size ${allowance.size()}`);
});

test("checkRateLimit treats addresses in one IPv6 /64 as one client", () => {
  const request = (ip) => new Request("https://example.test/", { headers: { "x-forwarded-for": ip } });
  const opts = { key: "test-v6", limit: 3, windowMs: 60_000 };
  const results = [1, 2, 3, 4].map((n) => checkRateLimit(request(`2001:db8:77:1::${n}`), opts).limited);
  assert.deepEqual(results, [false, false, false, true]);
  assert.equal(checkRateLimit(request("2001:db8:77:2::1"), opts).limited, false);
});
