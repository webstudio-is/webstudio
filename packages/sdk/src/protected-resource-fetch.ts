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

export type ProtectedResourceFetch = typeof fetch & {
  validateDestination: (url: URL) => void;
};

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const defaultMaxRedirects = 3;
const maxRequestBytes = 25 * 1024 * 1024;
const maxResponseBytes = 2 * 1024 * 1024;

/** Preserve the domain-wide policy for Node and Workers without public routing. */
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

/** Deterministic destination policy; connection and redirect checks stay in the transport. */
export const validateProtectedResourceDestination = (
  url: URL,
  deniedHostnames: readonly string[],
  matchSubdomains = true
) => {
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
      (hostname === domain ||
        (matchSubdomains && hostname.endsWith(`.${domain}`)))
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
  matchSubdomains = true,
  maxRedirects = defaultMaxRedirects,
}: {
  transport: ProtectedResourceTransport;
  deniedHostnames: readonly string[];
  matchSubdomains?: boolean;
  maxRedirects?: number;
}): ProtectedResourceFetch => {
  const validateDestination = (url: URL) =>
    validateProtectedResourceDestination(url, deniedHostnames, matchSubdomains);
  const protectedFetch: typeof fetch = async (input, init) => {
    const original = new Request(input, init);
    const body = await readLimitedBytes(original.body, maxRequestBytes);
    let headers = new Headers(original.headers);
    // The vetted URL controls DNS and TLS routing. A configured Host override
    // could otherwise route the public connection to an internal virtual host.
    headers.delete("host");
    let url = new URL(original.url);
    let redirects = 0;

    while (true) {
      validateDestination(url);
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
          validateDestination(next);
          if (next.origin !== url.origin) {
            if (
              (original.method !== "GET" && original.method !== "HEAD") ||
              body !== undefined
            ) {
              throw new Error(
                "Resource destination redirected a submission to another origin"
              );
            }
            // An origin change may be a public URL canonicalization. The new
            // origin must not receive any configured credentials or headers.
            headers = new Headers();
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
  return Object.assign(protectedFetch, { validateDestination });
};

/** Cloudflare's outbound proxy checks the destination at each fetch hop. */
export const createCloudflareProtectedResourceFetch = ({
  ownZoneHostnames,
  publicRouting = false,
  workerFetch = fetch,
}: {
  // With global_fetch_strictly_public, supply every site hostname to prevent
  // recursive requests. Without that flag, supply each zone to block origin access.
  ownZoneHostnames: readonly [string, ...string[]];
  // Set true only when the Worker is deployed with global_fetch_strictly_public.
  publicRouting?: boolean;
  workerFetch?: typeof fetch;
}): ProtectedResourceFetch => {
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
    matchSubdomains: !publicRouting,
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
