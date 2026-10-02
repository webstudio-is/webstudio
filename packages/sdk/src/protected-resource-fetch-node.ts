import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, fetch as undiciFetch } from "undici";
import { createProtectedResourceFetch } from "./protected-resource-fetch";

const benchmarkV4 = ipaddr.IPv4.parse("198.18.0.0");
const globalUnicastV6 = ipaddr.IPv6.parse("2000::");
const specialV6 = ipaddr.IPv6.parse("2001::");
const documentationV6 = ipaddr.IPv6.parse("3fff::");

const isPublicAddress = (address: string) => {
  try {
    const parsed = ipaddr.parse(address);
    if (parsed.range() !== "unicast") {
      return false;
    }
    if (parsed instanceof ipaddr.IPv4) {
      // ipaddr.js 1.x labels the RFC 2544 benchmark network as unicast.
      return parsed.match(benchmarkV4, 15) === false;
    }
    // Only currently assigned global IPv6 space. This excludes NAT64 local
    // translation and discard prefixes even when ipaddr.js calls them unicast.
    return (
      parsed.match(globalUnicastV6, 3) &&
      parsed.match(specialV6, 23) === false &&
      parsed.match(documentationV6, 20) === false
    );
  } catch {
    return false;
  }
};

const resolvePublicAddress = async (hostname: string) => {
  const literal = hostname.replace(/^\[|\]$/g, "");
  const family = isIP(literal);
  const addresses = family
    ? [{ address: literal, family }]
    : await lookup(hostname, { all: true, order: "verbatim" });
  if (
    addresses.length === 0 ||
    addresses.some(
      ({ address, family }) =>
        (family !== 4 && family !== 6) || isPublicAddress(address) === false
    )
  ) {
    throw new Error(
      "Resource destination does not resolve to public addresses"
    );
  }
  return addresses[0];
};

/**
 * DNS is resolved once per hop. Undici's connector receives only the vetted
 * address, while HTTP Host and TLS server name remain the original hostname.
 */
export const createNodeProtectedResourceFetch = ({
  deniedHostnames = [],
}: {
  deniedHostnames?: readonly string[];
} = {}): typeof fetch =>
  createProtectedResourceFetch({
    deniedHostnames,
    transport: async ({ url, method, headers, body, signal }) => {
      const resolved = await resolvePublicAddress(url.hostname);
      const agent = new Agent({
        connect: {
          lookup(hostname, options, callback) {
            if (hostname.toLowerCase() !== url.hostname.toLowerCase()) {
              callback(
                new Error("Resource destination changed during connection"),
                "",
                0
              );
              return;
            }
            if (options.all) {
              callback(null, [resolved]);
              return;
            }
            callback(null, resolved.address, resolved.family);
          },
        },
      });
      try {
        const response = await undiciFetch(url, {
          method,
          headers: Object.fromEntries(headers),
          body,
          signal,
          redirect: "manual",
          dispatcher: agent,
        });
        return {
          response: response as Response,
          release: async () => {
            await agent.close();
          },
        };
      } catch (error) {
        await agent.destroy();
        throw error;
      }
    },
  });
