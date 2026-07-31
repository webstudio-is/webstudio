import { enum as zEnum, strictObject, string } from "zod";
import type { DocumentGraphNode } from "./graph";
import type { DocumentSourceLoader } from "./document-source";
import {
  emitDocumentGraphRuntimeEvent,
  type DocumentGraphRuntimeObserver,
} from "./observability";

const documentSourceMetadata = strictObject({
  format: zEnum(["json", "markdown"]),
  revision: string().min(1),
});

export type HttpDocumentLoaderErrorCode =
  | "REQUEST_FAILED"
  | "HTTP_STATUS"
  | "BODY_MISSING"
  | "INVALID_METADATA";

export class HttpDocumentLoaderError extends Error {
  readonly code: HttpDocumentLoaderErrorCode;
  readonly documentId: string;
  readonly status?: number;

  constructor({
    code,
    message,
    documentId,
    status,
    cause,
  }: {
    code: HttpDocumentLoaderErrorCode;
    message: string;
    documentId: string;
    status?: number;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "HttpDocumentLoaderError";
    this.code = code;
    this.documentId = documentId;
    this.status = status;
  }
}

const streamResponseBody = (
  body: ReadableStream<Uint8Array>
): AsyncIterable<Uint8Array> => ({
  async *[Symbol.asyncIterator]() {
    const reader = body.getReader();
    let completed = false;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          completed = true;
          return;
        }
        yield chunk.value;
      }
    } finally {
      if (completed === false) {
        try {
          await reader.cancel();
        } catch {
          // Preserve the consumer error that stopped the stream.
        }
      }
      reader.releaseLock();
    }
  },
});

/** Adapts an injected HTTP/CDN transport to the revisioned source contract. */
export const createHttpDocumentSourceLoader =
  ({
    fetch: fetchResponse,
    getRequest,
    getMetadata,
    onEvent,
  }: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    getRequest: (node: DocumentGraphNode) => RequestInfo | URL;
    getMetadata: (input: {
      node: DocumentGraphNode;
      response: Response;
    }) => unknown;
    onEvent?: DocumentGraphRuntimeObserver;
  }): DocumentSourceLoader =>
  async (node, { signal }) => {
    const event = { documentId: node.id, revision: node.revision };
    emitDocumentGraphRuntimeEvent(onEvent, {
      type: "document-fetch-started",
      ...event,
    });
    let response: Response;
    try {
      response = await fetchResponse(getRequest(node), { signal });
    } catch (cause) {
      const error = new HttpDocumentLoaderError({
        code: "REQUEST_FAILED",
        message: `Document ${node.id} request failed`,
        documentId: node.id,
        cause,
      });
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "document-fetch-failed",
        ...event,
        errorCode: error.code,
      });
      throw error;
    }
    if (response.ok === false) {
      const error = new HttpDocumentLoaderError({
        code: "HTTP_STATUS",
        message: `Document ${node.id} request returned status ${response.status}`,
        documentId: node.id,
        status: response.status,
      });
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "document-fetch-failed",
        ...event,
        errorCode: error.code,
      });
      throw error;
    }
    let metadata;
    try {
      metadata = documentSourceMetadata.parse(getMetadata({ node, response }));
    } catch (cause) {
      const error = new HttpDocumentLoaderError({
        code: "INVALID_METADATA",
        message: `Document ${node.id} response metadata is invalid`,
        documentId: node.id,
        cause,
      });
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "document-fetch-failed",
        ...event,
        errorCode: error.code,
      });
      throw error;
    }
    const body = response.body;
    if (body === null) {
      const error = new HttpDocumentLoaderError({
        code: "BODY_MISSING",
        message: `Document ${node.id} response body is unavailable`,
        documentId: node.id,
      });
      emitDocumentGraphRuntimeEvent(onEvent, {
        type: "document-fetch-failed",
        ...event,
        errorCode: error.code,
      });
      throw error;
    }
    emitDocumentGraphRuntimeEvent(onEvent, {
      type: "document-fetch-completed",
      ...event,
    });
    return Object.freeze({
      ...metadata,
      source: streamResponseBody(body),
    });
  };
