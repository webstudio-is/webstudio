import { describe, test, expect, vi } from "vitest";
import { composeEventHandlers } from "./event-utils";

describe("composeEventHandlers", () => {
  test("executes handlers in sequence", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const event = {};

    const composed = composeEventHandlers([handler1, handler2]);
    composed(event);

    expect(handler1).toHaveBeenCalledWith(event);
    expect(handler2).toHaveBeenCalledWith(event);
  });

  test("stops execution if event.defaultPrevented is true", () => {
    const handler1 = vi.fn((event) => {
      event.defaultPrevented = true;
    });
    const handler2 = vi.fn();
    const event = {};

    const composed = composeEventHandlers([handler1, handler2]);
    composed(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  test("continues execution when checkForDefaultPrevented is false", () => {
    const handler1 = vi.fn((event) => {
      event.defaultPrevented = true;
    });
    const handler2 = vi.fn();
    const event = {};

    const composed = composeEventHandlers([handler1, handler2], {
      checkForDefaultPrevented: false,
    });
    composed(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
