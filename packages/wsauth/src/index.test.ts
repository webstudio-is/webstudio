import { describe, expect, test } from "vitest";
import {
  authenticateRequest,
  buildWsAuth,
  createBasicAuthRoute,
  createWsAuthResources,
  findWsAuthRoute,
  getBasicAuthCredentials,
  parseWsAuth,
  validateBasicAuth,
  validateWsAuthRoute,
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
    expect(validateWsAuthRoute("/private")).toBeUndefined();
    expect(validateWsAuthRoute("/docs/*")).toBeUndefined();
    expect(validateWsAuthRoute("private")).toBe('Route must start with "/"');
    expect(validateWsAuthRoute("/docs/*/page")).toBe(
      "Wildcard route segment must be the last segment"
    );
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
