import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { ScrollRestoration } from "./body";
import { UNSAFE_RemixContext } from "@remix-run/react";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test.each(["route", "history-anchor", "missing-anchor"])(
  "Remix %s restoration does not inherit smooth scrolling",
  async (navigation) => {
    const html = document.documentElement;
    const previousStyle = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const Layout = () => (
      <>
        <ScrollRestoration />
        <Outlet />
      </>
    );
    const router = createMemoryRouter(
      [
        {
          element: <Layout />,
          children: [
            {
              path: "/",
              element: (
                <div id="target" style={{ height: 3000 }}>
                  First
                </div>
              ),
            },
            {
              path: "/second",
              element: <div style={{ height: 3000 }}>Second</div>,
            },
          ],
        },
      ],
      { initialEntries: [navigation === "history-anchor" ? "/#target" : "/"] }
    );
    try {
      await act(async () =>
        root.render(
          <UNSAFE_RemixContext.Provider
            value={{
              isSpaMode: false,
              manifest: {
                entry: { imports: [], module: "" },
                routes: {},
                url: "",
                version: "",
              },
              routeModules: {},
              future: {
                v3_fetcherPersist: false,
                v3_relativeSplatPath: false,
                v3_lazyRouteDiscovery: false,
                v3_singleFetch: false,
              },
            }}
          >
            <RouterProvider router={router} />
          </UNSAFE_RemixContext.Provider>
        )
      );
      if (navigation === "history-anchor") {
        window.scrollTo({ top: 500, behavior: "instant" });
        await act(async () => {
          await router.navigate("/second");
        });
      }
      window.scrollTo({ top: 1000, behavior: "instant" });
      const scrollTo = window.scrollTo.bind(window);
      const behaviors: string[] = [];
      vi.spyOn(window, "scrollTo").mockImplementation(
        (...args: Parameters<typeof window.scrollTo>) => {
          behaviors.push(getComputedStyle(html).scrollBehavior);
          scrollTo(...args);
        }
      );
      await act(async () => {
        if (navigation === "history-anchor") {
          await router.navigate(-1);
        } else {
          await router.navigate(
            navigation === "missing-anchor" ? "/second#missing" : "/second"
          );
        }
      });
      expect(behaviors).toEqual(["auto"]);
      expect(window.scrollY).toBe(navigation === "history-anchor" ? 500 : 0);
      expect(html.style.scrollBehavior).toBe("smooth");
    } finally {
      vi.restoreAllMocks();
      act(() => root.unmount());
      router.dispose();
      container.remove();
      html.style.scrollBehavior = previousStyle;
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }
);
