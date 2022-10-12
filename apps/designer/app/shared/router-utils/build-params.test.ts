import { getBuildParams, getBuildOrigin } from "./build-params";

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
    "BUILD_ORIGIN",
    "BUILD_REQUIRE_SUBDOMAIN",
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

describe("getBuildOrigin", () => {
  test("Normal operation", () => {
    process.env.BUILD_ORIGIN = "https://foo.com";
    expect(getBuildOrigin(makeRequest("https://bar.com"))).toBe(
      "https://foo.com"
    );
  });

  test("Local development", () => {
    process.env.NODE_ENV = "development";
    expect(getBuildOrigin(makeRequest("http://localhost"))).toBe(
      "http://localhost"
    );
    expect(getBuildOrigin(makeRequest("http://localhost:1234"))).toBe(
      "http://localhost:1234"
    );
    expect(getBuildOrigin(makeRequest("http://foo.localhost:1234"))).toBe(
      "http://localhost:1234"
    );
  });

  test("Vercel preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "bar.foo.com";
    expect(getBuildOrigin(makeRequest("https://baz.com"))).toBe(
      "https://bar.foo.com"
    );
  });
});

describe("getCanvasRequestParams", () => {
  beforeEach(() => {
    process.env.BUILD_ORIGIN = "https://foo.com";
  });

  test("detects project domain", () => {
    const request = makeRequest("https://bar.foo.com");
    expect(
      (getBuildParams(request) as { projectDomain: string }).projectDomain
    ).toBe("bar");
  });

  test("doesn't detect project domain if base domain is not a user content domain", () => {
    const request = makeRequest("https://bar.baz.com");
    expect(getBuildParams(request)).toBeUndefined();
  });

  test("detects project id", () => {
    const request = makeRequest("https://foo.com?projectId=123");
    expect((getBuildParams(request) as { projectId: string }).projectId).toBe(
      "123"
    );
  });

  test("doesn't detect project id if domain is not a user content domain", () => {
    const request = makeRequest("https://baz.com?projectId=123");
    expect(getBuildParams(request)).toBeUndefined();
  });

  test("doesn't detect project id if BUILD_REQUIRE_SUBDOMAIN is true", () => {
    process.env.BUILD_REQUIRE_SUBDOMAIN = "true";
    const request = makeRequest("https://foo.com?projectId=123");
    expect(getBuildParams(request)).toBeUndefined();
  });

  test("detects path", () => {
    expect(getBuildParams(makeRequest("https://bar.foo.com"))?.pathname).toBe(
      "/"
    );
    expect(
      getBuildParams(makeRequest("https://bar.foo.com/abc"))?.pathname
    ).toBe("/abc");
    expect(
      getBuildParams(makeRequest("https://bar.foo.com/abc/123"))?.pathname
    ).toBe("/abc/123");
  });

  test("detects mode", () => {
    expect(
      getBuildParams(makeRequest("https://bar.foo.com?mode=edit"))?.mode
    ).toBe("edit");
    expect(
      getBuildParams(makeRequest("https://bar.foo.com?mode=preview"))?.mode
    ).toBe("preview");
    expect(getBuildParams(makeRequest("https://bar.foo.com"))?.mode).toBe(
      "published"
    );
  });
});
