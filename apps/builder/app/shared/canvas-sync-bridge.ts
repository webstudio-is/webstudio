import type { SyncEmitter } from "@webstudio-is/sync-client";

export type CanvasSyncFrame = HTMLIFrameElement & {
  __webstudioSharedSyncEmitter__?: SyncEmitter;
};

// The iframe element survives navigation to /canvas. Its emitter reference is
// consumed during Canvas startup, before authored scripts can access it.
export const attachCanvasSyncEmitter = (
  frame: CanvasSyncFrame,
  upstream: SyncEmitter
) => {
  const subscriptions = new Set<() => void>();
  let disposed = false;
  const emitter: SyncEmitter = {
    emit(message) {
      if (disposed === false) {
        upstream.emit(message);
      }
    },
    on(handler) {
      if (disposed) {
        return () => {};
      }
      const unsubscribe = upstream.on(handler);
      subscriptions.add(unsubscribe);
      return () => {
        if (subscriptions.delete(unsubscribe)) {
          unsubscribe();
        }
      };
    },
  };
  frame.__webstudioSharedSyncEmitter__ = emitter;

  return () => {
    disposed = true;
    for (const unsubscribe of subscriptions) {
      unsubscribe();
    }
    subscriptions.clear();
    if (frame.__webstudioSharedSyncEmitter__ === emitter) {
      delete frame.__webstudioSharedSyncEmitter__;
    }
  };
};

export const takeCanvasSyncEmitter = () => {
  try {
    const frame = window.frameElement as CanvasSyncFrame | null;
    const emitter = frame?.__webstudioSharedSyncEmitter__;
    if (frame) {
      delete frame.__webstudioSharedSyncEmitter__;
    }
    return emitter;
  } catch {
    // A standalone Canvas can be embedded from another origin.
  }
};
