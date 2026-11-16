import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_CHECK_DELAYS_MS, ACCESS_CHECK_WINDOW_MS, startAccessPolling } from "@/lib/access-polling";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

/** A poller whose refreshes settle as soon as they start. */
function settling(options: { isHidden?: () => boolean; now?: () => number } = {}) {
  const refresh = vi.fn();
  const onExpire = vi.fn();
  const poller = startAccessPolling({ refresh: () => { refresh(); queueMicrotask(() => poller.refreshSettled()); }, onExpire, ...options });
  return { refresh, onExpire, poller };
}

describe("startAccessPolling", () => {
  it("keeps the schedule inside the one-minute window", () => {
    const total = ACCESS_CHECK_DELAYS_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThan(ACCESS_CHECK_WINDOW_MS);
    expect(ACCESS_CHECK_WINDOW_MS).toBe(60_000);
  });

  it("checks a bounded number of times, then stops and reports it", async () => {
    const { refresh, onExpire } = settling();
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_DELAYS_MS[0] - 1);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_WINDOW_MS);
    expect(refresh).toHaveBeenCalledTimes(ACCESS_CHECK_DELAYS_MS.length);
    expect(onExpire).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10 * ACCESS_CHECK_WINDOW_MS);
    expect(refresh).toHaveBeenCalledTimes(ACCESS_CHECK_DELAYS_MS.length);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never starts a check while the previous one is still in flight", async () => {
    const refresh = vi.fn();
    const onExpire = vi.fn();
    const poller = startAccessPolling({ refresh, onExpire });
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_DELAYS_MS[0]);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    poller.refreshSettled();
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_DELAYS_MS[1]);
    expect(refresh).toHaveBeenCalledTimes(2);
    // A refresh that never settles still cannot outlast the window.
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_WINDOW_MS);
    expect(onExpire).toHaveBeenCalledTimes(1);
    poller.refreshSettled();
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_WINDOW_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("skips checks while the tab is hidden", async () => {
    let hidden = true;
    const { refresh } = settling({ isHidden: () => hidden });
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_DELAYS_MS[0] + ACCESS_CHECK_DELAYS_MS[1]);
    expect(refresh).not.toHaveBeenCalled();
    hidden = false;
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_DELAYS_MS[2]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops for good when a suspended tab wakes after the window", async () => {
    let clock = 0;
    const { refresh, onExpire } = settling({ now: () => clock });
    // The tab sleeps: wall-clock time passes but the first timer fires late.
    clock = ACCESS_CHECK_WINDOW_MS + 5_000;
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_DELAYS_MS[0]);
    expect(refresh).not.toHaveBeenCalled();
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears every timer when stopped, as on unmount", async () => {
    const { refresh, onExpire, poller } = settling();
    await vi.advanceTimersByTimeAsync(ACCESS_CHECK_DELAYS_MS[0]);
    poller.stop();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10 * ACCESS_CHECK_WINDOW_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
    poller.stop();
  });
});
