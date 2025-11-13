interface DNSList {
  description: string;
  publication: string;
  services: [string[], string[]][];
  version: string;
}

// Cache map to store TLD (top level domain) → RDAP server URL mappings
const dnsCache = new Map<string, string>();

/**
 * Fetch the IANA DNS RDAP bootstrap JSON.
 */
const fetchDnsList = async (): Promise<undefined | DNSList> => {
  try {
    const response = await fetch("https://data.iana.org/rdap/dns.json", {
      headers: {
        accept: "application/json,application/rdap+json",
      },
    });
    if (response.ok) {
      return response.json();
    }
  } catch {
    // empty block
  }
};

/**
 * Find the RDAP server URL for a given top-level domain (TLD).
 */
const findRdapServer = async (topLevelDomain: string) => {
  if (dnsCache.size === 0) {
    const dns = await fetchDnsList();
    if (dns) {
      for (const [domains, [server]] of dns.services) {
        for (const domain of domains) {
          dnsCache.set(domain, server);
        }
      }
    }
  }
  return dnsCache.get(topLevelDomain);
};

/**
 * Extract the top-level domain from a full domain string.
 * Unicode is converted to ascii
 */
const getTopLevelDomain = (domain: string) => {
  try {
    return new URL(`https://${domain}`).hostname.split(".").at(-1);
  } catch {
    // invalid domain
  }
};

const fetchRdap = async (
  rdapServer: string,
  domain: string
): Promise<undefined | string> => {
  try {
    const response = await fetch(`${rdapServer}domain/${domain}`, {
      headers: {
        accept: "application/json,application/rdap+json",
      },
    });
    if (response.ok) {
      return response.text();
    }
  } catch {
    // empty block
  }
};

/**
 * Determine whether a domain is using Cloudflare nameservers.
 * 1. Parse TLD from domain.
 * 2. Lookup RDAP server for that TLD.
 * 3. Fetch RDAP data for the domain.
 * 4. Search the raw response for ".ns.cloudflare.com".
 */
export const isDomainUsingCloudflareNameservers = async (domain: string) => {
  const topLevelDomain = getTopLevelDomain(domain);
  if (!topLevelDomain) {
    throw new Error("Could not parse the top level domain.");
  }

  const rdapServer = await findRdapServer(topLevelDomain);
  if (!rdapServer) {
    console.error(
      "RDAP Server for the given top level domain could not be found."
    );
    return undefined;
  }

  const data = await fetchRdap(rdapServer, domain);
  if (data) {
    // detect by nameservers rather than registrar url
    // sometimes stored as *.NS.CLOUDFLARE.COM
    return data.toLowerCase().includes(".ns.cloudflare.com");
  }
  return false;
};
