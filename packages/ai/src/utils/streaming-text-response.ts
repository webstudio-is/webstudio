import { StreamingTextResponse as _StreamingTextResponse } from "ai";

export type StreamingTextResponseType = StreamingTextResponse;

// vercel/ai's StreamingTextResponse does not include request.headers.raw()
// which @vercel/remix uses when deployed on vercel.
// Therefore we use a custom one.
export class StreamingTextResponse extends _StreamingTextResponse {
  constructor(res: ReadableStream, init?: ResponseInit) {
    super(res, init);
    this.getRequestHeaders();
  }

  getRequestHeaders() {
    return addRawHeaders(this.headers);
  }
}

const addRawHeaders = function addRawHeaders(headers: Headers) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  headers.raw = function () {
    const rawHeaders: { [k in string]: string[] } = {};
    const headerEntries = headers.entries();
    for (const [key, value] of headerEntries) {
      const headerKey = key.toLowerCase();
      // eslint-disable-next-line no-prototype-builtins
      if (rawHeaders.hasOwnProperty(headerKey)) {
        rawHeaders[headerKey].push(value);
      } else {
        rawHeaders[headerKey] = [value];
      }
    }
    return rawHeaders;
  };
  return headers;
};
