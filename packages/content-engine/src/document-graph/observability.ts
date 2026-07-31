export type DocumentGraphRuntimeEvent =
  | Readonly<{
      type: "roots-selected";
      rootCount: number;
    }>
  | Readonly<{
      type: "resolution-started" | "resolution-completed";
      rootCount: number;
      documentCount: number;
    }>
  | Readonly<{
      type: "resolution-failed";
      rootCount: number;
      documentCount: number;
      errorCode: string;
    }>
  | Readonly<{
      type:
        | "document-fetch-started"
        | "document-fetch-completed"
        | "document-cache-hit"
        | "document-cache-miss"
        | "document-cache-stored";
      documentId: string;
      revision: string;
    }>
  | Readonly<{
      type:
        | "document-fetch-failed"
        | "document-cache-read-failed"
        | "document-cache-write-failed";
      documentId: string;
      revision: string;
      errorCode: string;
    }>;

export type DocumentGraphRuntimeObserver = (
  event: DocumentGraphRuntimeEvent
) => void;

export const getDocumentGraphErrorCode = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const code = Reflect.get(error, "code");
    if (typeof code === "string" && code.length > 0) {
      return code;
    }
    const name = Reflect.get(error, "name");
    if (typeof name === "string" && name.length > 0) {
      return name;
    }
  }
  return "UNKNOWN";
};

/** Observer failures must never change content query behavior. */
export const emitDocumentGraphRuntimeEvent = (
  observer: DocumentGraphRuntimeObserver | undefined,
  event: DocumentGraphRuntimeEvent
) => {
  try {
    observer?.(event);
  } catch {
    // Observability is best effort.
  }
};

/** Adds transport-neutral fetch events around an object-store source loader. */
export const observeDocumentSourceLoader =
  ({
    load,
    onEvent,
  }: {
    load: DocumentSourceLoader;
    onEvent?: DocumentGraphRuntimeObserver;
  }): DocumentSourceLoader =>
  async (node, options) => {
    const event = { documentId: node.id, revision: node.revision };
    emitDocumentGraphRuntimeEvent(onEvent, {
      type: "document-fetch-started",
      ...event,
    });
    try {
      const source = await load(node, options);
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "document-fetch-completed",
        ...event,
      });
      return source;
    } catch (error) {
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "document-fetch-failed",
        ...event,
        errorCode: getDocumentGraphErrorCode(error),
      });
      throw error;
    }
  };
import type { DocumentSourceLoader } from "./document-source";
