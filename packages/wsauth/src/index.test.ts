import { describe, expect, test } from "vitest";
import {
  authenticateRequest,
  buildWsAuth,
  createBasicAuthRoute,
  createWsAuthResources,
  findWsAuthRoute,
  getBasicAuthCredentials,
  mergeWsAuthRoutes,
  parseWsAuth,
  stripGeneratedWsAuthContent,
  validateBasicAuth,
} from "./index";

describe("wsauth", () => {
  test("parses comments, blank lines, and basic auth routes", () => {
    expect(
      parseWsAuth(`
        # My auth pages
        /my/page me:idiot

        # Some other pages
        /bla/* bla:blubb
      `)
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

  test("reports line-specific parse errors", () => {
    expect(
      parseWsAuth(`
        page admin:secret
        /private admin
        /private admin:
        /docs/*/page admin:secret
      `).errors
    ).toEqual([
      { line: 2, message: 'Route must start with "/"' },
      {
        line: 3,
        message:
          'Basic auth expression must be non-empty login:password; login cannot contain ":" and neither field can contain whitespace',
      },
      {
        line: 4,
        message:
          'Basic auth expression must be non-empty login:password; login cannot contain ":" and neither field can contain whitespace',
      },
      { line: 5, message: "Wildcard route segment must be the last segment" },
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

  test("keeps the first rule for duplicate routes", () => {
    const result = parseWsAuth(`
      /private first:secret
      /private second:secret
    `);
    expect(mergeWsAuthRoutes(result.routes)).toEqual([result.routes[0]]);
  });

  test("builds merged content from text and route sources", () => {
    const result = buildWsAuth([
      {
        name: ".wsauth",
        content: "/private first:secret\n",
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
    expect(result.content).toBe(
      "# Webstudio auth pages\n/private first:secret\n/generated page:secret\n"
    );
  });

  test("builds resources from existing, project, and page inputs", () => {
    const result = createWsAuthResources({
      existingContent: [
        "# Manual auth pages",
        "/manual manual:secret",
        "",
        "# webstudio-auth-generated-start",
        "# Webstudio generated auth pages. Move routes outside this block to manage them manually.",
        "/stale stale:secret",
        "# webstudio-auth-generated-end",
        "",
      ].join("\n"),
      projectContent: "/project project:secret\n",
      pages: [
        {
          route: "/manual",
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
      "/manual",
      "/project",
      "/legacy",
    ]);
    expect(result.content).toBe(
      [
        "# Manual auth pages",
        "/manual manual:secret",
        "",
        "# webstudio-auth-generated-start",
        "# Webstudio generated auth pages. Move routes outside this block to manage them manually.",
        "/project project:secret",
        "/legacy legacy:secret",
        "# webstudio-auth-generated-end",
        "",
      ].join("\n")
    );
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

  test("strips stale generated route blocks before merging", () => {
    expect(
      stripGeneratedWsAuthContent(
        [
          "# Manual auth pages",
          "/manual manual:secret",
          "# webstudio-auth-generated-start",
          "/stale stale:secret",
          "# webstudio-auth-generated-end",
          "/after after:secret",
        ].join("\n")
      )
    ).toBe(
      [
        "# Manual auth pages",
        "/manual manual:secret",
        "/after after:secret",
      ].join("\n")
    );
  });

  test("rejects invalid generated page auth inputs", () => {
    expect(() =>
      createWsAuthResources({
        existingContent: "",
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
      'Basic auth requires non-empty login:password; login cannot contain ":" and neither field can contain whitespace'
    );
  });

  test("matches routes using page route syntax", () => {
    const { routes } = parseWsAuth(`
      / admin:root
      /blog/:slug writer:secret
      /docs/* docs:secret
    `);
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
