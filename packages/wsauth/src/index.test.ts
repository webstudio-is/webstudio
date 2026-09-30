import { describe, expect, test } from "vitest";
import {
  authenticateRequest,
  buildWsAuth,
  createBasicAuthRoute,
  createWsAuthResources,
  findWsAuthRoute,
  getBasicAuthCredentials,
  matchPathnamePattern,
  matchPathnameRoutes,
  matchesPathnamePattern,
  parseWsAuth,
  validateBasicAuth,
  validatePathnamePattern,
} from "./index";

describe("wsauth", () => {
  test("parses JSON auth config with route keys", () => {
    expect(
      parseWsAuth(
        JSON.stringify({
          version: 1,
          routes: {
            "/my/page": {
              method: "basic",
              login: "me",
              password: "idiot",
            },
            "/bla/*": {
              method: "basic",
              login: "bla",
              password: "blubb",
            },
          },
        })
      )
    ).toEqual({
      routes: [
        {
          route: "/my/page",
          auth: {
            method: "basic",
            login: "me",
            password: "idiot",
            credentials: "me:idiot",
          },
        },
        {
          route: "/bla/*",
          auth: {
            method: "basic",
            login: "bla",
            password: "blubb",
            credentials: "bla:blubb",
          },
        },
      ],
      errors: [],
    });
  });

  test("reports path-specific parse errors", () => {
    expect(
      parseWsAuth(
        JSON.stringify({
          version: 1,
          routes: {
            page: {
              method: "basic",
              login: "admin",
              password: "secret",
            },
            "/empty-password": {
              method: "basic",
              login: "admin",
              password: "",
            },
            "/docs/*/page": {
              method: "basic",
              login: "admin",
              password: "secret",
            },
          },
        })
      ).errors
    ).toEqual([
      {
        path: 'routes."page"',
        message: 'Route must start with "/"',
      },
      {
        path: 'routes."/empty-password".password',
        message: "Password is required",
      },
      {
        path: 'routes."/docs/*/page"',
        message: "Wildcard route segment must be the last segment",
      },
    ]);
  });

  test("validates basic auth fields", () => {
    const emptyResult = validateBasicAuth({ login: "", password: "" });
    expect(emptyResult.issues).toEqual([
      { path: ["login"], message: "Login is required" },
      { path: ["password"], message: "Password is required" },
    ]);
    expect(emptyResult.errors).toEqual({
      login: ["Login is required"],
      password: ["Password is required"],
    });
    const invalidResult = validateBasicAuth({
      login: "admin:root",
      password: "secret phrase",
    });
    expect(invalidResult.issues).toEqual([
      { path: ["login"], message: "Login can't contain a colon" },
      { path: ["password"], message: "Password can't contain whitespace" },
    ]);
    expect(invalidResult.errors).toEqual({
      login: ["Login can't contain a colon"],
      password: ["Password can't contain whitespace"],
    });
  });

  test("validates route syntax", () => {
    expect(validatePathnamePattern("/private")).toBeUndefined();
    expect(validatePathnamePattern("/docs/*")).toBeUndefined();
    expect(validatePathnamePattern("private")).toBe(
      'Route must start with "/"'
    );
    expect(validatePathnamePattern("/docs/*/page")).toBe(
      "Wildcard route segment must be the last segment"
    );
    expect(validatePathnamePattern("/docs?")).toBe(
      'Optional marker "?" is only allowed on a named parameter'
    );
    expect(validatePathnamePattern("/%2A")).toBe(
      'Encoded route syntax is not supported in "%2A"'
    );
  });

  test.each([
    ["/", undefined],
    ["/static/path", undefined],
    ["/:id", undefined],
    ["/:id?", undefined],
    ["/:path*", undefined],
    ["/*", undefined],
    ["/docs/", 'Route must not end with "/"'],
    ["/docs//api", 'Route must not contain repeating "/"'],
    ["/docs/*/api", "Wildcard route segment must be the last segment"],
    ["/docs/:path*/api", "Wildcard route segment must be the last segment"],
    ["/docs/:bad-name", 'Invalid route parameter ":bad-name"'],
    ["/docs/:name??", 'Invalid route parameter ":name??"'],
    ["/docs/a?", 'Optional marker "?" is only allowed on a named parameter'],
    ["/docs/a*", "Wildcard can only be used as * or :name*"],
    ["/%3Aid", 'Encoded route syntax is not supported in "%3Aid"'],
    ["/%3F", 'Encoded route syntax is not supported in "%3F"'],
    ["/%2A", 'Encoded route syntax is not supported in "%2A"'],
    ["/%ZZ", 'Invalid URL encoding in route segment "%ZZ"'],
  ] as const)("validates project rule %s", (pattern, error) => {
    expect(validatePathnamePattern(pattern)).toBe(error);
  });

  test.each([
    ["/", "/", true],
    ["/", "/docs", false],
    ["/*", "/", true],
    ["/*", "/docs/a", true],
    ["/docs/*", "/docs", true],
    ["/docs/*", "/docs/a", true],
    ["/docs", "/docs/a", false],
    ["/docs/:id", "/docs/a", true],
    ["/docs/:id", "/docs", false],
    ["/docs/:id?", "/docs", true],
    ["/docs/:id?", "/docs/a", true],
    ["/docs/:id?", "/docs/a/b", false],
    ["/docs/:id?", "/docs123", false],
    ["/docs/:rest*", "/docs/a/b", true],
    ["/docs/:rest*", "/docs", true],
    ["/docs/:rest*", "/docs123", false],
    ["/docs/*", "/docs123", false],
    ["/docs/*", "/docs/a/b", true],
    ["/docs/:id", "/docs/a/b", false],
    ["/docs/:id", "/docs/", false],
    ["/docs/:id?", "/docs/", true],
    ["/Docs", "/docs", true],
    ["/docs", "/docs/", true],
    ["/docs", "/docs//", true],
    ["/docs", "/%64ocs", true],
    ["/café", "/caf%C3%A9", true],
    ["/foo%20bar", "/foo%20bar", true],
    ["/path%2Bplus", "/path%2Bplus", true],
    ["/files/a%2Fb", "/files/a%2Fb", true],
    ["/files/a%2Fb", "/files/a/b", false],
    ["/%ZZ", "/%ZZ", true],
    ["", "/", true],
  ] as const)("matches %s against %s: %s", (pattern, pathname, expected) => {
    expect(matchesPathnamePattern(pattern, pathname)).toBe(expected);
  });

  test("returns published route parameters, including named splats", () => {
    expect(matchPathnamePattern("/docs/:rest*", "/docs/a/b")).toEqual({
      rest: "a/b",
    });
    expect(matchPathnamePattern("/docs/*", "/docs")).toEqual({ 0: "" });
    expect(matchPathnamePattern("/users/:id", "/users/caf%C3%A9")).toEqual({
      id: "café",
    });
    expect(matchPathnamePattern("/docs/:rest*", "/docs")).toEqual({
      rest: "",
    });
    expect(matchPathnamePattern("/docs/:id?", "/docs")).toEqual({});
    expect(matchPathnamePattern("/docs/:id?", "/docs/guide")).toEqual({
      id: "guide",
    });
    expect(matchPathnamePattern("/files/:name", "/files/a%2Fb")).toEqual({
      name: "a/b",
    });
  });

  test("selects the route preferred by the published router", () => {
    const routes = [
      { pattern: "/a/:x/:y", value: "first" },
      { pattern: "/:x/b/c", value: "second" },
    ];
    expect(matchPathnameRoutes(routes, "/a/b/c")?.value).toBe("second");
    expect(
      matchPathnameRoutes(
        [
          { pattern: "/docs/*", value: "splat" },
          { pattern: "/docs", value: "static" },
        ],
        "/docs"
      )?.value
    ).toBe("static");
  });

  test("ranks static and splat pages like the published router", () => {
    const routes = [
      { pattern: "/docs/*", value: "splat" },
      { pattern: "/docs/:slug?", value: "optional" },
      { pattern: "/docs/:slug", value: "dynamic" },
      { pattern: "/docs/guide", value: "static" },
    ];
    expect(matchPathnameRoutes(routes, "/docs/guide")?.value).toBe("static");
    // Optional and required parameters have equal rank; source order wins.
    expect(matchPathnameRoutes(routes, "/docs/other")?.value).toBe("optional");
    expect(matchPathnameRoutes(routes, "/docs/a/b")?.value).toBe("splat");
    expect(matchPathnameRoutes(routes, "/elsewhere")).toBeUndefined();
    expect(matchPathnameRoutes([], "/docs")).toBeUndefined();
  });

  test("keeps the first route when router scores are equal", () => {
    expect(
      matchPathnameRoutes(
        [
          { pattern: "/:first", value: "first" },
          { pattern: "/:second", value: "second" },
        ],
        "/page"
      )
    ).toEqual({ value: "first", params: { first: "page" } });
  });

  test("authentication still uses the first matching rule", () => {
    const routes = [
      createBasicAuthRoute({
        route: "/*",
        login: "general",
        password: "password",
      }),
      createBasicAuthRoute({
        route: "/docs",
        login: "docs",
        password: "password",
      }),
    ];
    expect(findWsAuthRoute(routes, "/docs")?.auth.login).toBe("general");
    expect(findWsAuthRoute(routes, "/docs/guide")?.auth.login).toBe("general");
    expect(findWsAuthRoute(routes, "/other")?.auth.login).toBe("general");
  });

  test("authentication scopes a wildcard to its base and descendants", () => {
    const routes = [
      createBasicAuthRoute({
        route: "/private/*",
        login: "admin",
        password: "password",
      }),
    ];
    for (const pathname of ["/private", "/private/", "/private/a/b"]) {
      expect(findWsAuthRoute(routes, pathname)).toBe(routes[0]);
    }
    for (const pathname of ["/", "/private-public", "/public/private"]) {
      expect(findWsAuthRoute(routes, pathname)).toBeUndefined();
    }
  });

  test("protects an encoded URL that resolves to an authenticated page", () => {
    const route = createBasicAuthRoute({
      route: "/docs",
      login: "admin",
      password: "password",
    });
    expect(() =>
      authenticateRequest(new Request("https://example.com/%64ocs"), [route])
    ).toThrowError(Response);
  });

  test("builds content from JSON and route sources", () => {
    const result = buildWsAuth([
      {
        name: "Auth",
        content: JSON.stringify({
          version: 1,
          routes: {
            "/private": {
              method: "basic",
              login: "first",
              password: "secret",
            },
          },
        }),
      },
      {
        name: "Generated page auth",
        routes: [
          createBasicAuthRoute({
            route: "/private",
            login: "second",
            password: "secret",
          }),
          createBasicAuthRoute({
            route: "/generated",
            login: "page",
            password: "secret",
          }),
        ],
      },
    ]);

    expect(result.routes.map(({ route }) => route)).toEqual([
      "/private",
      "/generated",
    ]);
    expect(JSON.parse(result.content)).toEqual({
      version: 1,
      routes: {
        "/private": {
          method: "basic",
          login: "second",
          password: "secret",
        },
        "/generated": {
          method: "basic",
          login: "page",
          password: "secret",
        },
      },
    });
  });

  test("builds resources from project and page inputs", () => {
    const result = createWsAuthResources({
      projectContent: JSON.stringify({
        version: 1,
        routes: {
          "/project": {
            method: "basic",
            login: "project",
            password: "secret",
          },
        },
      }),
      pages: [
        {
          route: "/project",
          auth: {
            method: "basic",
            login: "page",
            password: "secret",
          },
        },
        {
          route: "/legacy",
          auth: {
            type: "basic",
            login: "legacy",
            password: "secret",
          },
        },
        {
          route: "/public",
        },
      ],
    });

    expect(result.routes.map(({ route }) => route)).toEqual([
      "/project",
      "/legacy",
    ]);
    expect(JSON.parse(result.content)).toEqual({
      version: 1,
      routes: {
        "/project": {
          method: "basic",
          login: "page",
          password: "secret",
        },
        "/legacy": {
          method: "basic",
          login: "legacy",
          password: "secret",
        },
      },
    });
    expect(result.module).toBe(
      [
        `import type { WsAuthRoute } from "@webstudio-is/wsauth";`,
        "",
        `export const authRoutes: WsAuthRoute[] = ${JSON.stringify(
          result.routes,
          null,
          2
        )};`,
        "",
      ].join("\n")
    );
  });

  test("rejects invalid generated page auth inputs", () => {
    expect(() =>
      createWsAuthResources({
        pages: [
          {
            route: "/private",
            auth: {
              method: "basic",
              login: "",
              password: "secret",
            },
          },
        ],
      })
    ).toThrow(
      'Basic auth requires non-empty login and password; login cannot contain ":" and neither field can contain whitespace'
    );
  });

  test("matches routes using page route syntax", () => {
    const { routes } = parseWsAuth(
      JSON.stringify({
        version: 1,
        routes: {
          "/": { method: "basic", login: "admin", password: "root" },
          "/blog/:slug": {
            method: "basic",
            login: "writer",
            password: "secret",
          },
          "/docs/*": { method: "basic", login: "docs", password: "secret" },
        },
      })
    );
    expect(findWsAuthRoute(routes, "/")?.route).toBe("/");
    expect(findWsAuthRoute(routes, "/blog/post")?.route).toBe("/blog/:slug");
    expect(findWsAuthRoute(routes, "/docs/api/v1")?.route).toBe("/docs/*");
    expect(findWsAuthRoute(routes, "/public")).toBeUndefined();
  });

  test("extracts basic auth credentials from authorization header", () => {
    expect(getBasicAuthCredentials(`Basic ${btoa("admin:secret")}`)).toBe(
      "admin:secret"
    );
    expect(getBasicAuthCredentials(`basic ${btoa("admin:secret")}`)).toBe(
      "admin:secret"
    );
    expect(getBasicAuthCredentials(`Bearer token`)).toBeUndefined();
  });

  test("enforces basic auth for matching routes", () => {
    const authRoutes = [
      createBasicAuthRoute({
        route: "/private",
        login: "admin",
        password: "secret",
      }),
    ];

    expect(
      authenticateRequest(new Request("https://example.com/public"), authRoutes)
    ).toBeUndefined();
    expect(() =>
      authenticateRequest(
        new Request("https://example.com/private"),
        authRoutes
      )
    ).toThrow(Response);
    expect(
      authenticateRequest(
        new Request("https://example.com/private", {
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }),
        authRoutes
      )
    ).toBe(authRoutes[0]);

    try {
      authenticateRequest(
        new Request("https://example.com/private"),
        authRoutes
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(401);
      expect((error as Response).headers.get("WWW-Authenticate")).toBe(
        `Basic realm="Webstudio"`
      );
      expect((error as Response).headers.get("Cache-Control")).toBe(
        "private, no-store"
      );
    }
  });
});
