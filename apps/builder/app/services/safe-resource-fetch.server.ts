import type { LookupAddress } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

const blockedIPv4 = new BlockList();
for (const [subnet, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIPv4.addSubnet(subnet, prefix, "ipv4");
}

const globallyRoutableIPv6 = new BlockList();
globallyRoutableIPv6.addSubnet("2000::", 3, "ipv6");

const blockedIPv6 = new BlockList();
for (const [subnet, prefix] of [
  ["2001::", 23], // IETF protocol assignments, including Teredo
  ["2001:db8::", 32], // Documentation
  ["2002::", 16], // 6to4
  ["3fff::", 20], // Documentation
] as const) {
  blockedIPv6.addSubnet(subnet, prefix, "ipv6");
}

const isPublicAddress = (address: string, family: number) => {
  if (family === 4) {
    return blockedIPv4.check(address, "ipv4") === false;
  }
  return (
    globallyRoutableIPv6.check(address, "ipv6") &&
    blockedIPv6.check(address, "ipv6") === false
  );
};

type LookupOptions = { all?: boolean; family?: number } | number;
type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void;

// Resolve and validate in the socket connector itself so the address that is
// checked is also the address used for the connection (no DNS rebinding gap).
const lookupPublicAddress = (
  hostname: string,
  options: LookupOptions,
  callback: LookupCallback
) => {
  void dnsLookup(hostname, { all: true, verbatim: true }).then(
    (addresses) => {
      const requestedFamily =
        typeof options === "number" ? options : options.family;
      const candidates =
        requestedFamily === undefined || requestedFamily === 0
          ? addresses
          : addresses.filter(({ family }) => family === requestedFamily);

      // Reject the entire hostname if any answer is non-public. This also
      // prevents clients from choosing the private answer of a mixed DNS set.
      if (
        candidates.length === 0 ||
        addresses.some(
          ({ address, family }) => isPublicAddress(address, family) === false
        )
      ) {
        const error = Object.assign(
          new Error("Host is not publicly routable"),
          {
            code: "ENOTFOUND",
          }
        );
        callback(
          error,
          typeof options === "object" && options.all ? [] : "",
          0
        );
        return;
      }

      if (typeof options === "object" && options.all) {
        callback(null, candidates);
        return;
      }
      const selected = candidates[0];
      callback(null, selected.address, selected.family);
    },
    (cause: NodeJS.ErrnoException) => {
      callback(cause, typeof options === "object" && options.all ? [] : "", 0);
    }
  );
};

const dispatcher = new Agent({
  connections: 10,
  maxOrigins: 100,
  connect: { lookup: lookupPublicAddress as never },
});

const assertSafeUrl = (url: URL) => {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("Only HTTP and HTTPS resource URLs are supported");
  }
  if (url.username !== "" || url.password !== "") {
    throw new TypeError("Resource URLs cannot contain credentials");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const family = isIP(hostname);
  if (family !== 0 && isPublicAddress(hostname, family) === false) {
    throw new TypeError("Resource URL host is not publicly routable");
  }
};

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const entityHeaders = [
  "content-encoding",
  "content-language",
  "content-location",
  "content-type",
  "content-length",
];

/** Fetch an external resource only when every hop resolves to public IPs. */
export const safeResourceFetch = async (
  input: string,
  init?: RequestInit
): Promise<Response> => {
  let url = new URL(input.toString());
  let method = (init?.method ?? "GET").toUpperCase();
  let body = init?.body;
  const headers = new Headers(init?.headers);

  for (let redirects = 0; ; redirects += 1) {
    assertSafeUrl(url);
    const response = await undiciFetch(url, {
      ...init,
      method,
      headers,
      body,
      redirect: "manual",
      dispatcher,
    } as unknown as Parameters<typeof undiciFetch>[1]);

    const location = response.headers.get("location");
    if (redirectStatuses.has(response.status) === false || location === null) {
      return response as unknown as Response;
    }
    if (redirects >= 10) {
      await response.body?.cancel();
      throw new TypeError("Too many resource redirects");
    }

    const nextUrl = new URL(location, url);
    assertSafeUrl(nextUrl);
    if (nextUrl.origin !== url.origin) {
      headers.delete("authorization");
      headers.delete("proxy-authorization");
      headers.delete("cookie");
    }

    if (
      (response.status === 301 || response.status === 302) &&
      method === "POST"
    ) {
      method = "GET";
      body = undefined;
      for (const header of entityHeaders) {
        headers.delete(header);
      }
    } else if (
      response.status === 303 &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      method = "GET";
      body = undefined;
      for (const header of entityHeaders) {
        headers.delete(header);
      }
    }

    await response.body?.cancel();
    url = nextUrl;
  }
};
