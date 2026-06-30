import { beforeEach, describe, expect, test, vi } from "vitest";
import { createBuilderLogoutAction } from "./builder-logout-action.server";

const projectOrigin =
  "https://p-042d35b0-718e-4c5f-a5dd-8568282366e5.apps.webstudio.is";
const dashboardOrigin = "https://apps.webstudio.is";

const logout = vi.fn();
const action = createBuilderLogoutAction(logout);

const callAction = (request: Request) =>
  action({
    request,
    params: {},
    context: {},
  });

describe("builder logout action", () => {
  beforeEach(() => {
    logout.mockReset();
  });

  test("responds to authorized preflight with CORS headers", async () => {
    const response = await callAction(
      new Request(`${projectOrigin}/builder-logout`, {
        method: "OPTIONS",
        headers: {
          Origin: dashboardOrigin,
        },
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      dashboardOrigin
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true"
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST"
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type"
    );
  });

  test("adds CORS headers to successful logout response", async () => {
    logout.mockRejectedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          Location: `${dashboardOrigin}/login`,
          "Set-Cookie": "__Host-_session_builder_session_3=; Max-Age=0",
        },
      })
    );

    const response = await callAction(
      new Request(`${projectOrigin}/builder-logout`, {
        method: "POST",
        headers: {
          Origin: dashboardOrigin,
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "same-site",
        },
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      dashboardOrigin
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true"
    );
    expect(logout).toHaveBeenCalledWith(expect.any(Request), {
      redirectTo: `${dashboardOrigin}/login`,
    });
  });

  test("rejects preflight from a different origin", async () => {
    const response = await callAction(
      new Request(`${projectOrigin}/builder-logout`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil.example",
        },
      })
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("rejects same-origin builder requests without logging out", async () => {
    const response = await callAction(
      new Request(`${projectOrigin}/builder-logout`, {
        method: "POST",
        headers: {
          Origin: projectOrigin,
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "same-origin",
        },
      })
    );

    expect(response.status).toBe(403);
    expect(logout).not.toHaveBeenCalled();
  });
});
