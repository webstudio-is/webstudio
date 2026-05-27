import { describe, expect, test } from "vitest";

const [{ createBasicAuthRoute }, { __testing__ }] = await Promise.all([
  import("@webstudio-is/wsauth"),
  import("./section-auth"),
]);

const { parseAuthRoutes, validateRoute } = __testing__;

describe("project settings authentication", () => {
  test("parses stored auth config into editable routes", () => {
    expect(
      parseAuthRoutes(
        JSON.stringify({
          version: 1,
          routes: {
            "/private": {
              method: "basic",
              login: "admin",
              password: "secret",
            },
          },
        })
      ).routes
    ).toEqual([
      createBasicAuthRoute({
        route: "/private",
        login: "admin",
        password: "secret",
      }),
    ]);
  });

  test("validates route input", () => {
    const authRoutes = [
      createBasicAuthRoute({
        route: "/private",
        login: "admin",
        password: "secret",
      }),
    ];

    expect(validateRoute("", authRoutes)).toEqual(["Route is required"]);
    expect(validateRoute("private", authRoutes)).toEqual([
      'Route must start with "/"',
    ]);
    expect(validateRoute("/private", authRoutes)).toEqual([
      "This route already requires authentication",
    ]);
    expect(validateRoute("/docs/*", authRoutes)).toEqual([]);
  });
});
