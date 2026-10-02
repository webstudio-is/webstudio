import { expect, test, vi } from "vitest";
import { NanoEventsSyncEmitter } from "./sync-client";
import { attachCanvasSyncEmitter } from "./canvas-sync-bridge";

test("iframe sync bridge releases listeners on disposal", () => {
  const upstream = new NanoEventsSyncEmitter();
  const frame = {} as HTMLIFrameElement;
  const dispose = attachCanvasSyncEmitter(frame, upstream);
  const emitter = frame.__webstudioSharedSyncEmitter__;
  if (emitter === undefined) {
    throw new Error("Expected iframe sync emitter");
  }
  const onMessage = vi.fn();
  emitter.on(onMessage);
  upstream.emit({ clientId: "leader", type: "connect" });
  expect(onMessage).toHaveBeenCalledTimes(1);

  dispose();
  upstream.emit({ clientId: "leader", type: "connect" });
  emitter.emit({ clientId: "canvas", type: "connect" });
  expect(onMessage).toHaveBeenCalledTimes(1);
  expect(frame.__webstudioSharedSyncEmitter__).toBeUndefined();
});
