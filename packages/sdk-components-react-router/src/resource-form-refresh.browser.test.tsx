import { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import {
  createMemoryRouter,
  RouterProvider,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { Form } from "./resource-form";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const success = {
  success: true,
  status: 200,
  results: [
    {
      resourceId: "resource",
      resourceName: "resource",
      status: 200,
      body: { saved: true },
    },
  ],
  errors: [],
};

test("managed submission refreshes mutable page data once without replaying POST", async () => {
  let currentValue = "before";
  const resourceGets = vi.fn(
    async (_request: Request) => new Response(currentValue)
  );
  const loader = vi.fn(async () => ({
    value: await (
      await fetch("https://resource.example/value", { cache: "no-store" })
    ).text(),
  }));
  const posts = vi.fn(async () => {
    currentValue = "after";
    return Response.json(success);
  });
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    return request.method === "GET" ? resourceGets(request) : posts();
  });
  const results: unknown[] = [];
  const Page = () => {
    const { value } = useLoaderData() as { value: string };
    return (
      <>
        <output>{value}</output>
        <Form
          data-ws-managed-form-id="form"
          action={[{ dataSourceId: "resource" }]}
          onResultChange={(result) => results.push(result)}
        >
          <button type="submit">Send</button>
        </Form>
      </>
    );
  };
  const router = createMemoryRouter([{ path: "/", loader, element: <Page /> }]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await vi.waitFor(() =>
      expect(container.querySelector("output")?.textContent).toBe("before")
    );
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() =>
      expect(container.querySelector("output")?.textContent).toBe("after")
    );
    expect(loader).toHaveBeenCalledTimes(2);
    expect(resourceGets).toHaveBeenCalledTimes(2);
    expect(resourceGets.mock.calls[0][0].cache).toBe("no-store");
    expect(posts).toHaveBeenCalledTimes(1);
    expect(results).toEqual([success]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("success feedback scroll waits until delayed route revalidation settles", async () => {
  let finishRefresh: (() => void) | undefined;
  let loadCount = 0;
  const loader = vi.fn(async () => {
    loadCount++;
    if (loadCount > 1) {
      await new Promise<void>((resolve) => {
        finishRefresh = resolve;
      });
    }
    return { value: loadCount };
  });
  const posts = vi.fn(async () => Response.json(success));
  vi.stubGlobal("fetch", posts);
  const scrollIntoView = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  vi.spyOn(HTMLFormElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: window.innerHeight + 1,
    bottom: window.innerHeight + 20,
  } as DOMRect);
  const Page = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    const { value } = useLoaderData() as { value: number };
    return (
      <>
        <output>{value}</output>
        <Form
          data-ws-managed-form-id="form"
          action={[{ dataSourceId: "resource" }]}
          state={state}
          onStateChange={setState}
        >
          <button type="submit">Send</button>
          {state === "success" && <div>Submitted</div>}
        </Form>
      </>
    );
  };
  const router = createMemoryRouter([{ path: "/", loader, element: <Page /> }]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Submitted")
    );
    expect(scrollIntoView).not.toHaveBeenCalled();

    await act(async () => finishRefresh?.());
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce());
    expect(posts).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("success feedback stays visible when restoration follows route idle", async () => {
  let finishRefresh: (() => void) | undefined;
  let finishRestoration: (() => void) | undefined;
  let loadCount = 0;
  const loader = async () => {
    if (++loadCount === 2) {
      await new Promise<void>((resolve) => {
        finishRefresh = resolve;
      });
    }
    return null;
  };
  vi.stubGlobal("fetch", async () => Response.json(success));
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const Page = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    return (
      <>
        <ScrollRestoration />
        <div style={{ height: window.innerHeight * 2 }} />
        <Form
          data-ws-managed-form-id="form"
          action={[{ dataSourceId: "resource" }]}
          state={state}
          onStateChange={setState}
        >
          <button type="submit">Send</button>
          {state === "success" && <div data-feedback="success">Submitted</div>}
        </Form>
        <div style={{ height: window.innerHeight }} />
      </>
    );
  };
  const router = createMemoryRouter([{ path: "/", loader, element: <Page /> }]);
  const originalRevalidate = router.revalidate.bind(router);
  router.revalidate = async () => {
    await originalRevalidate();
    await new Promise<void>((resolve) => {
      finishRestoration = resolve;
    });
    // Model a late scroll restoration after the route reports idle.
    window.scrollTo(0, 0);
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await vi.waitFor(() => expect(loadCount).toBe(1));
    window.scrollTo(0, 0);
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(finishRefresh).toBeDefined());
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Submitted")
    );
    expect(window.scrollY).toBe(0);

    await act(async () => finishRefresh?.());
    await vi.waitFor(() => expect(finishRestoration).toBeDefined());
    for (let frame = 0; frame < 6; frame++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
    }
    expect(window.scrollY).toBe(0);
    await act(async () => finishRestoration?.());
    await vi.waitFor(() => expect(window.scrollY).toBeGreaterThan(0));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    const feedback = container.querySelector("[data-feedback='success']");
    expect(feedback).not.toBeNull();
    const feedbackBounds = feedback!.getBoundingClientRect();
    expect(feedbackBounds.top).toBeGreaterThanOrEqual(0);
    expect(feedbackBounds.bottom).toBeLessThanOrEqual(window.innerHeight);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.scrollTo(0, 0);
  }
});

test("failed submissions skip refresh and a later successful submission refreshes", async () => {
  let currentValue = "before";
  const loader = vi.fn(async () => ({ value: currentValue }));
  const posts = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        success: false,
        status: 422,
        results: [],
        errors: [{ status: 422, body: null, message: "failed" }],
      })
    )
    .mockImplementation(async () => {
      currentValue = "after";
      return Response.json(success);
    });
  vi.stubGlobal("fetch", posts);
  const Page = () => {
    const { value } = useLoaderData() as { value: string };
    return (
      <>
        <output>{value}</output>
        <Form
          data-ws-managed-form-id="form"
          action={[{ dataSourceId: "resource" }]}
        >
          <button type="submit">Send</button>
        </Form>
      </>
    );
  };
  const router = createMemoryRouter([{ path: "/", loader, element: <Page /> }]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(posts).toHaveBeenCalledTimes(1));
    expect(loader).toHaveBeenCalledTimes(1);
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() =>
      expect(container.querySelector("output")?.textContent).toBe("after")
    );
    expect(loader).toHaveBeenCalledTimes(2);
    expect(posts).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("a redirect skips refresh", async () => {
  const previousUrl = window.location.href;
  const loader = vi.fn(async () => ({ value: "before" }));
  const posts = vi.fn(async () => Response.json(success));
  vi.stubGlobal("fetch", posts);
  const router = createMemoryRouter([
    {
      path: "/",
      loader,
      element: (
        <Form
          data-ws-managed-form-id="form"
          action={[{ dataSourceId: "resource" }]}
          successRedirect="#done"
        >
          <button type="submit">Send</button>
        </Form>
      ),
    },
  ]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(window.location.hash).toBe("#done"));
    expect(posts).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.history.replaceState(null, "", previousUrl);
  }
});

test("navigation ignores an in-flight submission from the old page", async () => {
  let resolvePost: ((response: Response) => void) | undefined;
  const posts = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolvePost = resolve;
      })
  );
  vi.stubGlobal("fetch", posts);
  const results: unknown[] = [];
  const loader = vi.fn(async () => ({ value: "before" }));
  const router = createMemoryRouter([
    {
      path: "/",
      loader,
      element: (
        <Form
          data-ws-managed-form-id="form"
          action={[{ dataSourceId: "resource" }]}
          onResultChange={(result) => results.push(result)}
        >
          <button type="submit">Send</button>
        </Form>
      ),
    },
    { path: "/next", element: <output>Next page</output> },
  ]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(posts).toHaveBeenCalledTimes(1));
    await act(async () => {
      await router.navigate("/next");
    });
    await act(async () => resolvePost?.(Response.json(success)));
    expect(container.querySelector("output")?.textContent).toBe("Next page");
    expect(results).toEqual([]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(posts).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("refresh failure retains the completed success result and does not replay POST", async () => {
  let resourceCalls = 0;
  const loader = vi.fn(async () => {
    const response = await fetch("https://resource.example/value", {
      cache: "no-store",
    });
    return { value: response.ok ? await response.text() : "Unavailable" };
  });
  const posts = vi.fn(async () => Response.json(success));
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.method === "POST") {
      return posts();
    }
    resourceCalls++;
    return Promise.resolve(
      resourceCalls === 1
        ? new Response("before")
        : new Response("Resource down", { status: 503 })
    );
  });
  const results: unknown[] = [];
  const scrollIntoView = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  vi.spyOn(HTMLFormElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: window.innerHeight + 1,
    bottom: window.innerHeight + 20,
  } as DOMRect);
  const Page = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    const { value } = useLoaderData() as { value: string };
    return (
      <>
        <output>{value}</output>
        <Form
          data-ws-managed-form-id="form"
          action={[{ dataSourceId: "resource" }]}
          state={state}
          onStateChange={setState}
          onResultChange={(result) => results.push(result)}
        >
          <button type="submit">Send</button>
          {state === "success" && <div>Submitted</div>}
        </Form>
      </>
    );
  };
  const router = createMemoryRouter([
    {
      path: "/",
      loader,
      element: <Page />,
    },
  ]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    await vi.waitFor(() =>
      expect(container.querySelector("output")?.textContent).toBe("Unavailable")
    );
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      "success"
    );
    expect(results).toEqual([success]);
    expect(posts).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce());
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
