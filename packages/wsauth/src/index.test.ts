import { describe, expect, test } from "vitest";
import {
  authenticateProjectRequest,
  authenticateRequest,
  buildWsAuth,
  createBasicAuthRoute,
  createWsAuthResources,
  findWsAuthRoute,
  getBasicAuthCredentials,
  matchPathnamePattern,
  matchPathnameRoutes,
  parseWsAuth,
  parseWsAuthOrThrow,
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

  test.each([
    ["/", undefined],
    ["/private", undefined],
    ["/static/path", undefined],
    ["/docs/*", undefined],
    ["/:id", undefined],
    ["/:id?", undefined],
    ["/:path*", undefined],
    ["/*", undefined],
    ["private", 'Route must start with "/"'],
    ["/docs/", 'Route must not end with "/"'],
    ["/docs//api", 'Route must not contain repeating "/"'],
    ["/docs/*/api", "Wildcard route segment must be the last segment"],
    ["/docs/:path*/api", "Wildcard route segment must be the last segment"],
    ["/docs/:bad-name", 'Invalid route parameter ":bad-name"'],
    ["/docs/:name??", 'Invalid route parameter ":name??"'],
    ["/docs/a?", 'Optional marker "?" is only allowed on a named parameter'],
    ["/docs/a*", "Wildcard can only be used as * or :name*"],
    ["/%3Aid", undefined],
    ["/%3F", undefined],
    ["/%2A", undefined],
    ["/%252A", undefined],
    ["/%ZZ", undefined],
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
    expect(matchPathnamePattern(pattern, pathname) !== undefined).toBe(
      expected
    );
  });

  test.each([
    ["/%2A", "/%2A", true],
    ["/%2A", "/%2a", false],
    ["/%2A", "/docs", false],
    ["/%3F", "/%3F", true],
    ["/%3F", "/", false],
    ["/%3Aid", "/%3Aid", true],
    ["/%3Aid", "/docs", false],
    ["/%252A", "/%252A", true],
    ["/%252A", "/%2A", false],
    ["/%ZZ", "/%ZZ", true],
    ["/docs/%2A", "/docs/%2A", true],
    ["/docs/%2A", "/docs/guide", false],
  ] as const)(
    "does not interpret a saved encoded literal %s as router syntax at %s",
    (pattern, pathname, expected) => {
      expect(matchPathnamePattern(pattern, pathname) !== undefined).toBe(
        expected
      );
    }
  );

  test("ranks saved encoded literals without losing other routes", () => {
    const routes = [
      { pattern: "/:id", value: "dynamic" },
      { pattern: "/%2A", value: "encoded literal" },
      { pattern: "/docs", value: "docs" },
    ];
    expect(matchPathnameRoutes(routes, "/%2A")?.value).toBe("encoded literal");
    expect(matchPathnameRoutes(routes, "/docs")?.value).toBe("docs");
    expect(matchPathnameRoutes(routes, "/%2a")?.params).toEqual({ id: "*" });
  });

  test("restores parameters when another route wins over an encoded literal", () => {
    const routes = [
      { pattern: "/%2A/other", value: "encoded literal" },
      { pattern: "/:id/leaf", value: "dynamic" },
    ];
    expect(matchPathnameRoutes(routes, "/%2A/leaf")).toEqual({
      value: "dynamic",
      params: { id: "*" },
    });
    expect(
      matchPathnameRoutes(
        [
          { pattern: "/a%2Fb%2A/other", value: "encoded literal" },
          { pattern: "/:id/leaf", value: "dynamic" },
        ],
        "/a%2Fb%2A/leaf"
      )?.params
    ).toEqual({ id: "a/b*" });
  });

  test("an encoded NUL cannot impersonate a literal rule placeholder", () => {
    expect(matchPathnamePattern("/%2A", "/%000%00")).toBeUndefined();
  });

  test("preserves a previously saved encoded auth rule", () => {
    const content = JSON.stringify({
      version: 1,
      routes: {
        "/%2A": {
          method: "basic",
          login: "admin",
          password: "secret",
        },
      },
    });
    const routes = parseWsAuthOrThrow(content, "Saved auth");
    expect(findWsAuthRoute(routes, "/%2A")?.route).toBe("/%2A");
    expect(findWsAuthRoute(routes, "/docs")).toBeUndefined();
    expect(() =>
      authenticateRequest(new Request("https://example.com/%2A"), routes)
    ).toThrowError(Response);
    expect(
      authenticateRequest(new Request("https://example.com/docs"), routes)
    ).toBeUndefined();
  });

  test("returns Remix route parameters", () => {
    expect(matchPathnamePattern("/docs/:rest*", "/docs/a/b")).toEqual({
      "*": "a/b",
    });
    expect(matchPathnamePattern("/docs/*", "/docs")).toEqual({ "*": "" });
    expect(matchPathnamePattern("/users/:id", "/users/caf%C3%A9")).toEqual({
      id: "café",
    });
    expect(matchPathnamePattern("/docs/:rest*", "/docs")).toEqual({
      "*": "",
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

  test("project domain exemption uses the request URL, not forwarded host headers", () => {
    const authRoutes = [
      createBasicAuthRoute({
        route: "/private/*",
        login: "admin",
        password: "secret",
      }),
    ];
    const projectDomain = "project";

    expect(
      authenticateProjectRequest(
        new Request("https://project.wstd.work/private"),
        authRoutes,
        projectDomain
      )
    ).toBeUndefined();

    expect(() =>
      authenticateProjectRequest(
        new Request("https://customer.example/private", {
          headers: { "x-forwarded-host": "project.wstd.work" },
        }),
        authRoutes,
        projectDomain
      )
    ).toThrow(Response);

    expect(
      authenticateProjectRequest(
        new Request("https://customer.example/private", {
          headers: {
            "x-forwarded-host": "project.wstd.work",
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }),
        authRoutes,
        projectDomain
      )
    ).toBe(authRoutes[0]);

    expect(() =>
      authenticateProjectRequest(
        new Request("https://customer.example/private", {
          headers: { Host: "project.wstd.work" },
        }),
        authRoutes,
        projectDomain
      )
    ).toThrow(Response);
  });
});
