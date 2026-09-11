import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { YouTube } from "./youtube";

const sdkContext = {
  assetBaseUrl: "/assets/",
  imageLoader: ({ src }: { src: string }) => src,
  videoLoader: ({ src }: { src: string }) => src,
  resources: {},
  breakpoints: [],
  onError: vi.fn(),
  renderer: "preview" as const,
};

const getPreconnectOrigins = () =>
  Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="preconnect"]')
  ).map((link) => new URL(link.href).origin);

const renderYouTube = (props: ComponentProps<typeof YouTube>) => (
  <ReactSdkContext.Provider value={sdkContext}>
    <YouTube url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" {...props} />
  </ReactSdkContext.Provider>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("preconnect is consent-aware and only warms the player", async () => {
  vi.spyOn(window, "matchMedia").mockImplementation(
    () => ({ matches: false }) as MediaQueryList
  );

  const { rerender } = render(
    renderYouTube({
      preconnect: false,
      privacyEnhancedMode: false,
      showPreview: true,
    })
  );

  await Promise.resolve();
  expect(getPreconnectOrigins()).toEqual([]);

  rerender(renderYouTube({ privacyEnhancedMode: false, showPreview: false }));

  await waitFor(() =>
    expect(getPreconnectOrigins()).toContain("https://www.youtube.com")
  );
  expect(getPreconnectOrigins()).not.toContain("https://img.youtube.com");

  rerender(
    renderYouTube({
      preconnect: true,
      showPreview: true,
      children: <div>Custom preview</div>,
    })
  );

  await waitFor(() =>
    expect(getPreconnectOrigins()).toContain("https://www.youtube-nocookie.com")
  );
  expect(getPreconnectOrigins()).not.toContain("https://img.youtube.com");
});
