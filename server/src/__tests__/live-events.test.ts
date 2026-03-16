import { describe, it, expect, vi } from "vitest";
import { publishCompanyEvent, subscribeCompanyLiveEvents } from "../services/live-events.js";

describe("live events", () => {
  it("delivers events to subscribers", () => {
    const listener = vi.fn();
    const unsub = subscribeCompanyLiveEvents("company-1", listener);

    publishCompanyEvent("company-1", "test.event", { foo: "bar" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      type: "test.event",
      data: { foo: "bar" },
    });

    unsub();
  });

  it("does not deliver to unsubscribed listeners", () => {
    const listener = vi.fn();
    const unsub = subscribeCompanyLiveEvents("company-2", listener);
    unsub();

    publishCompanyEvent("company-2", "test.event", {});
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not deliver events for other companies", () => {
    const listener = vi.fn();
    const unsub = subscribeCompanyLiveEvents("company-3", listener);

    publishCompanyEvent("company-other", "test.event", {});
    expect(listener).not.toHaveBeenCalled();

    unsub();
  });

  it("supports multiple subscribers", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = subscribeCompanyLiveEvents("company-4", listener1);
    const unsub2 = subscribeCompanyLiveEvents("company-4", listener2);

    publishCompanyEvent("company-4", "test.event", {});

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
  });
});
