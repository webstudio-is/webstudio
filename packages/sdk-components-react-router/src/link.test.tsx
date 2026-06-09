/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { ReactSdkContext, useResource } from "@webstudio-is/react-sdk/runtime";
import { HtmlEmbed } from "@webstudio-is/sdk-components-react";
import { Link } from "./link";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  document.body.innerHTML = "";
});

const render = async (children: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(children);
  });
};

test("internal link click does not rerender current generated page while destination is pending", async () => {
  let pageRenderCount = 0;
  let linkContentRenderCount = 0;
  let resolveNextLoader: undefined | (() => void);

  const LinkContent = () => {
    linkContentRenderCount += 1;
    return <>Next</>;
  };

  const Page = () => {
    pageRenderCount += 1;
    return (
      <>
        <div>Home</div>
        <Link href="/next">
          <LinkContent />
        </Link>
      </>
    );
  };

  const PageBoundary = React.memo(
    ({ url }: { system: { pathname: string }; url: string }) => {
      return <Page key={url} />;
    },
    (prevProps, nextProps) => prevProps.url === nextProps.url
  );

  const GeneratedRoute = () => {
    const { resources, system, url } = useLoaderData() as {
      resources: Record<string, unknown>;
      system: { pathname: string };
      url: string;
    };
    const sdkContext = React.useMemo(
      () => ({
        assetBaseUrl: "/assets/",
        imageLoader: ({ src }: { src: string }) => src,
        videoLoader: ({ src }: { src: string }) => src,
        resources,
        breakpoints: [],
        onError: vi.fn(),
      }),
      [resources]
    );
    return (
      <ReactSdkContext.Provider value={sdkContext}>
        <PageBoundary url={url} system={system} />
      </ReactSdkContext.Provider>
    );
  };

  const Next = () => {
    useLoaderData();
    return <div>Next page</div>;
  };

  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => ({
          resources: {},
          system: { pathname: "/" },
          url: "https://example.com/",
        }),
        element: <GeneratedRoute />,
      },
      {
        path: "/next",
        loader: () =>
          new Promise((resolve) => {
            resolveNextLoader = () => resolve(null);
          }),
        element: <Next />,
      },
    ],
    { initialEntries: ["/"] }
  );

  await render(<RouterProvider router={router} />);

  expect(pageRenderCount).toBe(1);
  expect(linkContentRenderCount).toBe(1);

  const link = document.querySelector("a");
  expect(link).not.toBeNull();

  await act(async () => {
    link?.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      })
    );
    await Promise.resolve();
  });

  expect(document.body.textContent).toContain("Home");
  expect(document.body.textContent).not.toContain("Next page");
  expect(pageRenderCount).toBe(1);
  expect(linkContentRenderCount).toBe(1);

  await act(async () => {
    resolveNextLoader?.();
    await Promise.resolve();
  });

  expect(document.body.textContent).toContain("Next page");
});

test("same-url resource changes still update current generated page", async () => {
  let pageRenderCount = 0;
  let resources: Record<string, unknown> = { message: "first" };

  const Page = () => {
    pageRenderCount += 1;
    const message = useResource("message");
    return <div>{String(message)}</div>;
  };

  const PageBoundary = React.memo(
    ({ url }: { system: { pathname: string }; url: string }) => {
      return <Page key={url} />;
    },
    (prevProps, nextProps) => prevProps.url === nextProps.url
  );

  const GeneratedRoute = () => {
    const { resources, system, url } = useLoaderData() as {
      resources: Record<string, unknown>;
      system: { pathname: string };
      url: string;
    };
    const sdkContext = React.useMemo(
      () => ({
        assetBaseUrl: "/assets/",
        imageLoader: ({ src }: { src: string }) => src,
        videoLoader: ({ src }: { src: string }) => src,
        resources,
        breakpoints: [],
        onError: vi.fn(),
      }),
      [resources]
    );
    return (
      <ReactSdkContext.Provider value={sdkContext}>
        <PageBoundary url={url} system={system} />
      </ReactSdkContext.Provider>
    );
  };

  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => ({
          resources,
          system: { pathname: "/" },
          url: "https://example.com/",
        }),
        element: <GeneratedRoute />,
      },
    ],
    { initialEntries: ["/"] }
  );

  await render(<RouterProvider router={router} />);

  expect(pageRenderCount).toBe(1);
  expect(document.body.textContent).toContain("first");

  resources = { message: "second" };

  await act(async () => {
    router.revalidate();
    await Promise.resolve();
  });

  expect(pageRenderCount).toBe(2);
  expect(document.body.textContent).toContain("second");
});

test("html embed scripts are not reprocessed until navigation reaches a new url", async () => {
  let resolveNextLoader: undefined | (() => void);

  const HomePage = () => {
    return (
      <>
        <HtmlEmbed code={`<script data-testid="home-script"></script>`} />
        <Link href="/next">Next</Link>
      </>
    );
  };

  const NextPage = () => {
    return <HtmlEmbed code={`<script data-testid="next-script"></script>`} />;
  };

  const PageBoundary = React.memo(
    ({
      page,
      url,
    }: {
      page: "home" | "next";
      system: { pathname: string };
      url: string;
    }) => {
      // Use the URL as the key to force scripts in HTML Embed to reload on dynamic pages
      return (
        <div key={url}>{page === "home" ? <HomePage /> : <NextPage />}</div>
      );
    },
    (prevProps, nextProps) => prevProps.url === nextProps.url
  );

  const GeneratedRoute = () => {
    const { page, resources, system, url } = useLoaderData() as {
      page: "home" | "next";
      resources: Record<string, unknown>;
      system: { pathname: string };
      url: string;
    };
    const sdkContext = React.useMemo(
      () => ({
        assetBaseUrl: "/assets/",
        imageLoader: ({ src }: { src: string }) => src,
        videoLoader: ({ src }: { src: string }) => src,
        resources,
        breakpoints: [],
        onError: vi.fn(),
      }),
      [resources]
    );
    return (
      <ReactSdkContext.Provider value={sdkContext}>
        <PageBoundary page={page} url={url} system={system} />
      </ReactSdkContext.Provider>
    );
  };

  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => ({
          page: "home",
          resources: {},
          system: { pathname: "/" },
          url: "https://example.com/",
        }),
        element: <GeneratedRoute />,
      },
      {
        path: "/next",
        loader: () =>
          new Promise((resolve) => {
            resolveNextLoader = () =>
              resolve({
                page: "next",
                resources: {},
                system: { pathname: "/next" },
                url: "https://example.com/next",
              });
          }),
        element: <GeneratedRoute />,
      },
    ],
    { initialEntries: ["/"] }
  );

  await render(<RouterProvider router={router} />);

  await act(async () => {
    await Promise.resolve();
  });

  expect(
    document.querySelectorAll('[data-testid="client-home-script"]')
  ).toHaveLength(1);
  expect(
    document.querySelector('[data-testid="client-next-script"]')
  ).toBeNull();

  const link = document.querySelector("a");
  expect(link).not.toBeNull();

  await act(async () => {
    link?.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      })
    );
    await Promise.resolve();
  });

  expect(
    document.querySelectorAll('[data-testid="client-home-script"]')
  ).toHaveLength(1);
  expect(
    document.querySelector('[data-testid="client-next-script"]')
  ).toBeNull();

  await act(async () => {
    resolveNextLoader?.();
    await Promise.resolve();
  });

  expect(
    document.querySelector('[data-testid="client-home-script"]')
  ).toBeNull();
  expect(
    document.querySelectorAll('[data-testid="client-next-script"]')
  ).toHaveLength(1);
});
