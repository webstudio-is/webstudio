import { StreamingTextResponse } from "ai";

// vercel/ai's StreamingTextResponse does not include request.headers.raw()
// which @vercel/remix uses when deployed on vercel.
// Therefore we use a custom one.
export class RemixStreamingTextResponse extends StreamingTextResponse {
  constructor(res: ReadableStream, init?: ResponseInit) {
    super(res, init);
    this.getRequestHeaders();
  }

  getRequestHeaders() {
    return addRawHeaders(this.headers);
  }
}

const addRawHeaders = (headers: Headers) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  headers.raw = () => {
    const rawHeaders: { [k in string]: string[] } = {};
    const headerEntries = headers.entries();
    for (const [key, value] of headerEntries) {
      const headerKey = key.toLowerCase();
      if (headerKey in rawHeaders) {
        rawHeaders[headerKey].push(value);
      } else {
        rawHeaders[headerKey] = [value];
      }
    }
    return rawHeaders;
  };
  return headers;
};
