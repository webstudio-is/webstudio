import { createCookieSessionStorage } from "@remix-run/node";
import env from "~/env/env.server";
import { BloomFilter } from "./bloom-filter.server";
import { getSessionCookieNameVersion } from "./auth.server.utils";

// export the whole sessionStorage object
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    // Using the __Host- prefix to prevent a malicious user from setting another person's session cookie
    // on all subdomains of apps.webstudio.is, e.g., setting Domain=.apps.webstudio.is.
    // For more information, see: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies#name
    name: `__Host-_session_${getSessionCookieNameVersion()}`,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: env.AUTH_SECRET ? [env.AUTH_SECRET] : undefined,
    secure: true,
  },
});

// Bloom filter: probabilistic data structure to efficiently check if session IDs are logged in.
// Allowing tracking of user login status for specific projects
const bloomFilterKey = "login_session_bloom_filter";

export const readLoginSessionBloomFilter = async (request: Request) => {
  try {
    const session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    const bloomFilter = session.get(bloomFilterKey);

    if (typeof bloomFilter === "string") {
      return BloomFilter.deserialize(bloomFilter);
    }

    return new BloomFilter(50, 0.02);
  } catch (error) {
    console.error("Error reading bloom filter", error);
    return new BloomFilter(50, 0.02);
  }
};

export const writeLoginSessionBloomFilter = async (
  request: Request,
  response: Response,
  bloomFilter: BloomFilter
) => {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );

  session.set(bloomFilterKey, bloomFilter.serialize());

  const result = new Response(response.body, response);

  result.headers.append(
    "Set-Cookie",
    await sessionStorage.commitSession(session)
  );

  return result;
};
