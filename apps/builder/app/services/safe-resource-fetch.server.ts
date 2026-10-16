import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, buildConnector, fetch as undiciFetch } from "undici";

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

const blockedIPv6 = new BlockList();
const globallyRoutableIPv6 = new BlockList();
globallyRoutableIPv6.addSubnet("2000::", 3, "ipv6");
blockedIPv6.addSubnet("2001::", 23, "ipv6");
blockedIPv6.addSubnet("2001:db8::", 32, "ipv6");
blockedIPv6.addSubnet("2002::", 16, "ipv6");
blockedIPv6.addSubnet("3fff::", 20, "ipv6");

const isPublicAddress = (address: string, family: number) => {
  if (family === 4) {
    // Builder E2E fixtures run on loopback; production never enables this.
    if (
      process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS === "true" &&
      blockedIPv4.check(address, "ipv4") &&
      address.startsWith("127.")
    ) {
      return true;
    }
    return blockedIPv4.check(address, "ipv4") === false;
  }
  if (
    process.env.E2E_ALLOW_LOCAL_RESOURCE_URLS === "true" &&
    address === "::1"
  ) {
    return true;
  }
  return (
    globallyRoutableIPv6.check(address, "ipv6") &&
    blockedIPv6.check(address, "ipv6") === false
  );
};

type LookupOptions =
  | { all?: boolean; family?: number | "IPv4" | "IPv6" }
  | number;
type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void;

// Validate DNS answers in the socket connector so the checked address is the
// address used for the connection. The connector also checks literal IPs,
// including on redirect hops.
const lookupPublicAddress = (
  hostname: string,
  options: LookupOptions,
  callback: LookupCallback
) => {
  dnsLookup(hostname, { all: true, verbatim: true }, (cause, addresses) => {
    if (cause !== null) {
      callback(cause, typeof options === "object" && options.all ? [] : "", 0);
      return;
    }

    const requestedFamily =
      typeof options === "number" ? options : options.family;
    const family =
      requestedFamily === "IPv4"
        ? 4
        : requestedFamily === "IPv6"
          ? 6
          : requestedFamily;
    const candidates =
      family === undefined || family === 0
        ? addresses
        : addresses.filter((address) => address.family === family);

    if (
      candidates.length === 0 ||
      addresses.some(
        ({ address, family }) => isPublicAddress(address, family) === false
      )
    ) {
      const error = Object.assign(new Error("Host is not publicly routable"), {
        code: "ENOTFOUND",
      });
      callback(error, typeof options === "object" && options.all ? [] : "", 0);
      return;
    }

    if (typeof options === "object" && options.all) {
      callback(null, candidates);
      return;
    }
    const selected = candidates[0];
    callback(null, selected.address, selected.family);
  });
};

const connector = buildConnector({ lookup: lookupPublicAddress as never });
const safeConnector: ReturnType<typeof buildConnector> = (
  options,
  callback
) => {
  const hostname = options.hostname.replace(/^\[|\]$/g, "");
  const family = isIP(hostname);
  if (family !== 0 && isPublicAddress(hostname, family) === false) {
    callback(new Error("Host is not publicly routable"), null);
    return;
  }
  connector(options, callback);
};

const dispatcher = new Agent({
  connections: 10,
  maxOrigins: 100,
  connect: safeConnector,
});

/** Fetch an external resource only when its connection uses a public IP. */
export const safeResourceFetch = async (
  input: string,
  init?: RequestInit
): Promise<Response> => {
  const response = await undiciFetch(input, {
    ...init,
    dispatcher,
  } as unknown as Parameters<typeof undiciFetch>[1]);
  return response as unknown as Response;
};
