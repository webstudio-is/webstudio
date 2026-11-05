import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { ScrollRestoration } from "./body";
import { expect, test, vi } from "vitest";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test.each([
  "route",
  "history",
  "history-anchor",
  "missing-anchor",
  "preserve",
  "anchor",
] as const)(
  "%s navigation preserves the intended scroll behavior",
  async (navigation) => {
    const html = document.documentElement;
    const previousStyle = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const Layout = () => (
      <>
        <Outlet />
        <ScrollRestoration />
      </>
    );
    const history = navigation === "history" || navigation === "history-anchor";
    const router = createMemoryRouter(
      [
        {
          element: <Layout />,
          children: [
            {
              path: "/",
              element: (
                <div
                  id={navigation === "anchor" ? undefined : "target"}
                  style={{ height: 3000 }}
                >
                  First
                </div>
              ),
            },
            {
              path: "/second",
              element: (
                <div style={{ height: 3000 }}>
                  Second
                  <div id="target" style={{ marginTop: 1000 }}>
                    Target
                  </div>
                </div>
              ),
            },
          ],
        },
      ],
      { initialEntries: [navigation === "history-anchor" ? "/#target" : "/"] }
    );
    const scrollTo = window.scrollTo.bind(window);
    const behaviors: string[] = [];
    try {
      await act(async () => root.render(<RouterProvider router={router} />));
      if (history) {
        window.scrollTo({ top: 500, behavior: "instant" });
        await act(async () => {
          await router.navigate("/second");
        });
      }
      window.scrollTo({ top: 1000, behavior: "instant" });
      vi.spyOn(window, "scrollTo").mockImplementation(
        (...args: Parameters<typeof window.scrollTo>) => {
          behaviors.push(getComputedStyle(html).scrollBehavior);
          scrollTo(...args);
        }
      );
      const anchorBehaviors: string[] = [];
      if (navigation === "anchor") {
        vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(
          () => {
            anchorBehaviors.push(getComputedStyle(html).scrollBehavior);
          }
        );
      }
      await act(async () => {
        if (history) {
          await router.navigate(-1);
        } else {
          await router.navigate(
            navigation === "anchor"
              ? "/second#target"
              : navigation === "missing-anchor"
                ? "/second#missing"
                : "/second",
            { preventScrollReset: navigation === "preserve" }
          );
        }
      });
      expect(behaviors).toEqual(
        navigation === "anchor" || navigation === "preserve" ? [] : ["auto"]
      );
      if (navigation === "anchor") {
        expect(anchorBehaviors).toEqual(["smooth"]);
      } else {
        expect(window.scrollY).toBe(
          history ? 500 : navigation === "preserve" ? 1000 : 0
        );
      }
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
