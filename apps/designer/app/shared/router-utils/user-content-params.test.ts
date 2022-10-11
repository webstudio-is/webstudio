import {
  getUserContentParams,
  getUserContentBaseUrl,
} from "./user-content-params";

const makeRequest = (url: string, headers: { [key: string]: string } = {}) => ({
  url,
  headers: {
    get: (name: string) => {
      if (headers[name] !== undefined) {
        return headers[name];
      }
      if (name === "host" || name === "x-forwarded-host") {
        return new URL(url).host;
      }
      return null;
    },
  },
});

const originalEnv = { ...process.env };
afterEach(() => {
  for (const name of [
    "USER_CONTENT_BASE_URL",
    "USER_CONTENT_REQUIRE_SUBDOMAIN",
    "VERCEL_ENV",
    "VERCEL_URL",
    "NODE_ENV",
  ]) {
    if (originalEnv[name] !== undefined) {
      process.env[name] = originalEnv[name];
    } else {
      // setting process.env.SOMETHING to undefined
      // results in it being set to a string "undefined"
      delete process.env[name];
    }
  }
});

describe("getUserContentBaseUrl", () => {
  test("Normal operation", () => {
    process.env.USER_CONTENT_BASE_URL = "https://foo.com";
    expect(getUserContentBaseUrl(makeRequest("https://bar.com"))).toBe(
      "https://foo.com"
    );
  });

  test("Local development", () => {
    process.env.NODE_ENV = "development";
    expect(getUserContentBaseUrl(makeRequest("http://localhost"))).toBe(
      "http://localhost"
    );
    expect(getUserContentBaseUrl(makeRequest("http://localhost:1234"))).toBe(
      "http://localhost:1234"
    );
    expect(
      getUserContentBaseUrl(makeRequest("http://foo.localhost:1234"))
    ).toBe("http://localhost:1234");
  });

  test("Vercel preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "bar.foo.com";
    expect(getUserContentBaseUrl(makeRequest("https://baz.com"))).toBe(
      "https://bar.foo.com"
    );
  });
});

describe("getCanvasRequestParams", () => {
  beforeEach(() => {
    process.env.USER_CONTENT_BASE_URL = "https://foo.com";
  });

  test("detects project domain", () => {
    const request = makeRequest("https://bar.foo.com");
    expect(
      (getUserContentParams(request) as { projectDomain: string }).projectDomain
    ).toBe("bar");
  });

  test("doesn't detect project domain if base domain is not a user content domain", () => {
    const request = makeRequest("https://bar.baz.com");
    expect(getUserContentParams(request)).toBeUndefined();
  });

  test("detects project id", () => {
    const request = makeRequest("https://foo.com?projectId=123");
    expect(
      (getUserContentParams(request) as { projectId: string }).projectId
    ).toBe("123");
  });

  test("doesn't detect project id if domain is not a user content domain", () => {
    const request = makeRequest("https://baz.com?projectId=123");
    expect(getUserContentParams(request)).toBeUndefined();
  });

  test("doesn't detect project id if USER_CONTENT_REQUIRE_SUBDOMAIN is true", () => {
    process.env.USER_CONTENT_REQUIRE_SUBDOMAIN = "true";
    const request = makeRequest("https://foo.com?projectId=123");
    expect(getUserContentParams(request)).toBeUndefined();
  });

  test("detects path", () => {
    expect(
      getUserContentParams(makeRequest("https://bar.foo.com"))?.pathname
    ).toBe("/");
    expect(
      getUserContentParams(makeRequest("https://bar.foo.com/abc"))?.pathname
    ).toBe("/abc");
    expect(
      getUserContentParams(makeRequest("https://bar.foo.com/abc/123"))?.pathname
    ).toBe("/abc/123");
  });

  test("detects mode", () => {
    expect(
      getUserContentParams(makeRequest("https://bar.foo.com?mode=edit"))?.mode
    ).toBe("edit");
    expect(
      getUserContentParams(makeRequest("https://bar.foo.com?mode=preview"))
        ?.mode
    ).toBe("preview");
    expect(getUserContentParams(makeRequest("https://bar.foo.com"))?.mode).toBe(
      "published"
    );
  });
});
