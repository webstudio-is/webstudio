import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { VimeoPreviewImage } from "./vimeo-preview-image";
import { YouTube } from "./youtube";

const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";
const ORIGINAL_PLAYER_ORIGIN = "https://www.youtube.com";
const IMAGE_ORIGIN = "https://img.youtube.com";

const sdkContext = {
  assetBaseUrl: "/assets/",
  imageLoader: ({ src }: { src: string }) => src,
  videoLoader: ({ src }: { src: string }) => src,
  resources: {},
  breakpoints: [],
  onError: vi.fn(),
  renderer: "preview" as const,
};

const findPreconnect = (origin: string) =>
  Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="preconnect"]')
  ).find((link) => new URL(link.href).origin === origin) ?? null;

const renderYouTube = (props: ComponentProps<typeof YouTube>) => (
  <ReactSdkContext.Provider value={sdkContext}>
    <YouTube url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" {...props} />
  </ReactSdkContext.Provider>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("preconnect can be disabled and only warms origins that are used", async () => {
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
  expect(findPreconnect(PLAYER_ORIGIN)).toBeNull();
  expect(findPreconnect(ORIGINAL_PLAYER_ORIGIN)).toBeNull();
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();

  rerender(renderYouTube({ showPreview: false }));

  await Promise.resolve();
  expect(findPreconnect(PLAYER_ORIGIN)).toBeNull();
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();

  rerender(renderYouTube({ privacyEnhancedMode: false, showPreview: false }));

  await waitFor(() =>
    expect(findPreconnect(ORIGINAL_PLAYER_ORIGIN)).not.toBeNull()
  );
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();

  rerender(
    renderYouTube({
      preconnect: true,
      showPreview: true,
      children: <VimeoPreviewImage src="/custom-preview.jpg" />,
    })
  );

  await Promise.resolve();
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();

  await waitFor(() => expect(findPreconnect(PLAYER_ORIGIN)).not.toBeNull());
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();
});
