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
import { HtmlEmbed } from "@webstudio-is/sdk-components-react/components";
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

const sdkContext = {
  assetBaseUrl: "/assets/",
  imageLoader: ({ src }: { src: string }) => src,
  videoLoader: ({ src }: { src: string }) => src,
  resources: {},
  breakpoints: [],
  onError: vi.fn(),
};

test("local link is current only when pathname, search, and hash match", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/path",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link href="/path?tag=bla#section">Exact</Link>
            <Link href="/path">Path only</Link>
            <Link href="/path?tag=bla">Missing hash</Link>
            <Link href="/path?tag=other#section">Different query</Link>
            <Link href="/path#section">Missing query</Link>
            <Link href="#section">Hash only</Link>
            <Link href="#">Bare hash</Link>
            <Link href="?tag=bla#section">Search only</Link>
            <Link href="">Empty</Link>
            <Link href="/path?tag=bla#section" className="custom">
              Active class
            </Link>
            <Link href="/path" className="custom">
              Inactive class
            </Link>
            <Link href="/path?tag=bla#section" aria-current="location">
              Aria override
            </Link>
          </ReactSdkContext.Provider>
        ),
      },
    ],
    { initialEntries: ["/path?tag=bla#section"] }
  );

  await render(<RouterProvider router={router} />);

  const links = Array.from(document.querySelectorAll("a"));

  expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([
    "page",
    null,
    null,
    null,
    null,
    "page",
    null,
    "page",
    null,
    "page",
    null,
    "location",
  ]);

  expect(links[0]?.getAttribute("class")).toBe("active");
  expect(links[1]?.hasAttribute("class")).toBe(false);
  expect(links[9]?.getAttribute("class")).toBe("custom active");
  expect(links[10]?.getAttribute("class")).toBe("custom");
});

test("local link preserves exact pathname behavior", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/path/*",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link href="/path">Parent</Link>
            <Link href="/path/child">Child</Link>
            <Link href="/path/">Trailing slash</Link>
            <Link href="/Path/child">Different case</Link>
          </ReactSdkContext.Provider>
        ),
      },
    ],
    { initialEntries: ["/path/child"] }
  );

  await render(<RouterProvider router={router} />);

  const links = Array.from(document.querySelectorAll("a"));

  expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([
    null,
    "page",
    null,
    null,
  ]);
});

test("external link renders as plain anchor without router context", async () => {
  await render(
    <Link
      href="https://example.com/page"
      prefetch="intent"
      preventScrollReset
      reloadDocument
      replace
      target="_blank"
    >
      External
    </Link>
  );

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("https://example.com/page");
  expect(link?.getAttribute("target")).toBe("_blank");
  expect(link?.hasAttribute("prefetch")).toBe(false);
  expect(link?.hasAttribute("preventscrollreset")).toBe(false);
  expect(link?.hasAttribute("reloaddocument")).toBe(false);
  expect(link?.hasAttribute("replace")).toBe(false);
});

test("protocol-relative link renders as plain anchor without router context", async () => {
  await render(<Link href="//example.com/page">Protocol relative</Link>);

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("//example.com/page");
});

test("protocol links render as plain anchors without router context", async () => {
  await render(
    <>
      <Link href="mailto:hello@example.com">Email</Link>
      <Link href="tel:+15555555555">Phone</Link>
    </>
  );

  const links = Array.from(document.querySelectorAll("a"));

  expect(links[0]?.getAttribute("href")).toBe("mailto:hello@example.com");
  expect(links[1]?.getAttribute("href")).toBe("tel:+15555555555");
});

test("asset link renders as plain anchor without router context", async () => {
  await render(
    <ReactSdkContext.Provider value={sdkContext}>
      <Link href="/assets/file.pdf">Asset</Link>
    </ReactSdkContext.Provider>
  );

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("/assets/file.pdf");
  expect(link?.getAttribute("aria-current")).toBeNull();
});

test("asset base url only excludes matching root-relative asset paths", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/path",
        element: (
          <ReactSdkContext.Provider
            value={{ ...sdkContext, assetBaseUrl: "/assets/" }}
          >
            <Link href="/assets">Asset-looking page</Link>
            <Link href="/assets2/file.pdf">Similar prefix page</Link>
          </ReactSdkContext.Provider>
        ),
      },
    ],
    { initialEntries: ["/path"] }
  );

  await render(<RouterProvider router={router} />);

  const links = Array.from(document.querySelectorAll("a"));

  expect(links[0]?.getAttribute("href")).toBe("/assets");
  expect(links[1]?.getAttribute("href")).toBe("/assets2/file.pdf");
  expect(links[0]?.getAttribute("data-discover")).toBe("true");
  expect(links[1]?.getAttribute("data-discover")).toBe("true");
});

test("hash-only link does not start router navigation", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/path",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link
              href="#section"
              prefetch="intent"
              preventScrollReset
              reloadDocument
              replace
            >
              Hash
            </Link>
          </ReactSdkContext.Provider>
        ),
      },
      {
        path: "/other",
        element: <div>Other page</div>,
      },
    ],
    { initialEntries: ["/path?tag=bla#section"] }
  );

  await render(<RouterProvider router={router} />);

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("#section");
  expect(link?.getAttribute("aria-current")).toBe("page");
  expect(link?.hasAttribute("prefetch")).toBe(false);
  expect(link?.hasAttribute("preventscrollreset")).toBe(false);
  expect(link?.hasAttribute("reloaddocument")).toBe(false);
  expect(link?.hasAttribute("replace")).toBe(false);

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

  expect(router.state.location.pathname).toBe("/path");
  expect(router.state.location.search).toBe("?tag=bla");
  expect(router.state.location.hash).toBe("#section");
});

test("bare hash link targets the current page without the current hash", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/path",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link href="#">Hash</Link>
          </ReactSdkContext.Provider>
        ),
      },
    ],
    { initialEntries: ["/path?tag=bla#section"] }
  );

  await render(<RouterProvider router={router} />);

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("#");
  expect(link?.getAttribute("aria-current")).toBeNull();
});

test("empty local link preserves the current search and clears the hash", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/path",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link href="">Empty</Link>
          </ReactSdkContext.Provider>
        ),
      },
      {
        path: "/other",
        element: <div>Other page</div>,
      },
    ],
    { initialEntries: ["/path?tag=bla#section"] }
  );

  await render(<RouterProvider router={router} />);

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("/path?tag=bla");
  expect(link?.getAttribute("aria-current")).toBeNull();

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

  expect(router.state.location.pathname).toBe("/path");
  expect(router.state.location.search).toBe("?tag=bla");
  expect(router.state.location.hash).toBe("");
});

test("omitted href renders plain anchor fallback", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/path",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link>Missing href</Link>
          </ReactSdkContext.Provider>
        ),
      },
    ],
    { initialEntries: ["/path"] }
  );

  await render(<RouterProvider router={router} />);

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("#");
  expect(link?.getAttribute("aria-current")).toBeNull();
  expect(link?.hasAttribute("data-discover")).toBe(false);
});

test("router link forwards navigation props and resolves relative href", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/parent/child",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link href="../next?tab=1#section" preventScrollReset replace>
              Relative
            </Link>
          </ReactSdkContext.Provider>
        ),
      },
      {
        path: "/next",
        element: <div>Next route</div>,
      },
    ],
    { initialEntries: ["/parent/child"] }
  );

  await render(<RouterProvider router={router} />);

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("/next?tab=1#section");
  expect(link?.getAttribute("data-discover")).toBe("true");

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

  expect(router.state.location.pathname).toBe("/next");
  expect(router.state.location.search).toBe("?tab=1");
  expect(router.state.location.hash).toBe("#section");
});

test("router link forwards discovery props", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link href="/next" discover="none">
              Next
            </Link>
          </ReactSdkContext.Provider>
        ),
      },
      {
        path: "/next",
        element: <div>Next route</div>,
      },
    ],
    { initialEntries: ["/"] }
  );

  await render(<RouterProvider router={router} />);

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("/next");
  expect(link?.hasAttribute("data-discover")).toBe(false);
  expect(link?.hasAttribute("discover")).toBe(false);
});

test("router link calls onClick and respects preventDefault", async () => {
  const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  });
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link href="/next" onClick={onClick}>
              Next
            </Link>
          </ReactSdkContext.Provider>
        ),
      },
      {
        path: "/next",
        element: <div>Next page</div>,
      },
    ],
    { initialEntries: ["/"] }
  );

  await render(<RouterProvider router={router} />);

  const link = document.querySelector("a");

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

  expect(onClick).toHaveBeenCalledTimes(1);
  expect(router.state.location.pathname).toBe("/");
});

test("reloadDocument router link still calls onClick", async () => {
  const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  });
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <ReactSdkContext.Provider value={sdkContext}>
            <Link href="/next" reloadDocument onClick={onClick}>
              Next
            </Link>
          </ReactSdkContext.Provider>
        ),
      },
      {
        path: "/next",
        element: <div>Next page</div>,
      },
    ],
    { initialEntries: ["/"] }
  );

  await render(<RouterProvider router={router} />);

  const link = document.querySelector("a");

  expect(link?.getAttribute("href")).toBe("/next");
  expect(link?.getAttribute("data-discover")).toBe("true");

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

  expect(onClick).toHaveBeenCalledTimes(1);
  expect(router.state.location.pathname).toBe("/");
});

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
