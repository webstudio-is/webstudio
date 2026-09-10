import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("preconnect can be disabled and only warms origins that are used", async () => {
  vi.spyOn(window, "matchMedia").mockImplementation(
    () => ({ matches: false }) as MediaQueryList
  );

  const { rerender } = render(
    <ReactSdkContext.Provider value={sdkContext}>
      <YouTube
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        preconnect={false}
        privacyEnhancedMode={false}
        showPreview
      />
    </ReactSdkContext.Provider>
  );

  await Promise.resolve();
  expect(findPreconnect(PLAYER_ORIGIN)).toBeNull();
  expect(findPreconnect(ORIGINAL_PLAYER_ORIGIN)).toBeNull();
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();

  rerender(
    <ReactSdkContext.Provider value={sdkContext}>
      <YouTube
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        showPreview={false}
      />
    </ReactSdkContext.Provider>
  );

  await Promise.resolve();
  expect(findPreconnect(PLAYER_ORIGIN)).toBeNull();
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();

  rerender(
    <ReactSdkContext.Provider value={sdkContext}>
      <YouTube
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        privacyEnhancedMode={false}
        showPreview={false}
      />
    </ReactSdkContext.Provider>
  );

  await waitFor(() =>
    expect(findPreconnect(ORIGINAL_PLAYER_ORIGIN)).not.toBeNull()
  );
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();

  rerender(
    <ReactSdkContext.Provider value={sdkContext}>
      <YouTube
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        preconnect
        showPreview
      >
        <VimeoPreviewImage src="/custom-preview.jpg" />
      </YouTube>
    </ReactSdkContext.Provider>
  );

  await Promise.resolve();
  expect(findPreconnect(IMAGE_ORIGIN)).toBeNull();

  rerender(
    <ReactSdkContext.Provider value={sdkContext}>
      <YouTube
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        preconnect
        showPreview
      />
    </ReactSdkContext.Provider>
  );

  await waitFor(() => expect(findPreconnect(IMAGE_ORIGIN)).not.toBeNull());
});
