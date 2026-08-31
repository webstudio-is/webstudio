import { describe, expect, test } from "vitest";
import { privateNoStoreResponseHeaders } from "./cache-control.server";
import { redirect, setNoStoreToRedirect } from "./no-store-redirect";

describe("no-store redirects", () => {
  test("creates redirects with private no-store headers", () => {
    const response = redirect("/login");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
    expect(response.headers.get("Cache-Control")).toBe(
      privateNoStoreResponseHeaders["Cache-Control"]
    );
    expect(response.headers.get("Vary")).toBe(
      privateNoStoreResponseHeaders.Vary
    );
  });

  test("adds private no-store headers to existing redirects without losing headers", () => {
    const response = new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
        "Set-Cookie": "session=value",
        Vary: "Origin",
      },
    });

    const result = setNoStoreToRedirect(response);

    expect(result.headers.get("Location")).toBe("/dashboard");
    expect(result.headers.get("Set-Cookie")).toBe("session=value");
    expect(result.headers.get("Cache-Control")).toBe(
      privateNoStoreResponseHeaders["Cache-Control"]
    );
    expect(result.headers.get("Vary")).toBe("Origin, Cookie");
  });
});
