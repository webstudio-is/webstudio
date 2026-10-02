import { getDomain } from "tldts";

/** Transport for visitor-triggered Resource requests. */
export type ProtectedResourceHop = {
  url: URL;
  method: string;
  headers: Headers;
  body: Uint8Array | undefined;
  signal: AbortSignal;
};

export type ProtectedResourceTransport = (
  hop: ProtectedResourceHop
) => Promise<{ response: Response; release?: () => Promise<void> }>;

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const defaultMaxRedirects = 3;
const maxRequestBytes = 25 * 1024 * 1024;
const maxResponseBytes = 2 * 1024 * 1024;

/** Include each site's registrable domain to block sibling hosts in its zone. */
export const getDeniedResourceHostnames = (
  hostnames: readonly (string | undefined)[]
) =>
  Array.from(
    new Set([
      "webstudio.is",
      "webstudio.io",
      ...hostnames
        .filter((hostname): hostname is string => hostname !== undefined)
        .flatMap((hostname) => [hostname, getDomain(hostname) ?? hostname]),
    ])
  );

const readLimitedBytes = async (
  stream: ReadableStream<Uint8Array> | null,
  maximum: number
) => {
  if (stream === null) {
    return;
  }
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new Error("Resource request or response is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const validateDestination = (url: URL, deniedHostnames: readonly string[]) => {
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error(
      "Resource destination must be an HTTP(S) URL without credentials"
    );
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  for (const denied of deniedHostnames) {
    const domain = denied.toLowerCase().replace(/\.$/, "");
    if (
      domain !== "" &&
      (hostname === domain || hostname.endsWith(`.${domain}`))
    ) {
      throw new Error("Resource destination is not allowed");
    }
  }
};

/**
 * This policy is only safe with a transport that enforces public network access
 * at connection time. A URL check followed by ambient fetch is insufficient.
 */
export const createProtectedResourceFetch = ({
  transport,
  deniedHostnames,
  maxRedirects = defaultMaxRedirects,
}: {
  transport: ProtectedResourceTransport;
  deniedHostnames: readonly string[];
  maxRedirects?: number;
}): typeof fetch => {
  return async (input, init) => {
    const original = new Request(input, init);
    const body = await readLimitedBytes(original.body, maxRequestBytes);
    const headers = new Headers(original.headers);
    // The vetted URL controls DNS and TLS routing. A configured Host override
    // could otherwise route the public connection to an internal virtual host.
    headers.delete("host");
    let url = new URL(original.url);
    let redirects = 0;

    while (true) {
      validateDestination(url, deniedHostnames);
      const { response, release } = await transport({
        url,
        method: original.method,
        headers,
        body,
        signal: original.signal,
      });
      try {
        const location = response.headers.get("location");
        if (redirectStatuses.has(response.status) && location !== null) {
          await response.body?.cancel();
          if (redirects >= maxRedirects) {
            throw new Error("Resource destination redirected too many times");
          }
          if (
            original.method !== "GET" &&
            original.method !== "HEAD" &&
            response.status !== 307 &&
            response.status !== 308
          ) {
            throw new Error(
              "Resource destination changed the submission method"
            );
          }
          const next = new URL(location, url);
          validateDestination(next, deniedHostnames);
          if (next.origin !== url.origin) {
            throw new Error(
              "Resource destination redirected to another origin"
            );
          }
          url = next;
          redirects += 1;
          continue;
        }
        const bytes = await readLimitedBytes(response.body, maxResponseBytes);
        return new Response(
          response.status === 204 ||
            response.status === 205 ||
            response.status === 304
            ? null
            : bytes,
          {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          }
        );
      } finally {
        await release?.();
      }
    }
  };
};

/** Cloudflare's outbound proxy checks the destination at each fetch hop. */
export const createCloudflareProtectedResourceFetch = ({
  ownZoneHostnames,
  workerFetch = fetch,
}: {
  // Cloudflare permits requests to the Worker's own origin, including private
  // origins. The caller must supply every zone hosted by this Worker.
  ownZoneHostnames: readonly [string, ...string[]];
  workerFetch?: typeof fetch;
}): typeof fetch => {
  if (
    ownZoneHostnames.length === 0 ||
    ownZoneHostnames.some((host) => host === "")
  ) {
    throw new Error(
      "Worker zones must be specified for protected Resource requests"
    );
  }
  return createProtectedResourceFetch({
    deniedHostnames: ownZoneHostnames,
    transport: async ({ url, method, headers, body, signal }) => ({
      response: await workerFetch(url, {
        method,
        headers,
        body: body?.slice().buffer as ArrayBuffer | undefined,
        signal,
        redirect: "manual",
      }),
    }),
  });
};
