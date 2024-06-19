import { describe, test, expect } from "@jest/globals";
import { createImageLoader } from "./image-loaders";

const decodePathFragment = (fragment: string) => {
  return decodeURIComponent(fragment);
};

const encodePathFragment = (fragment: string) => {
  return encodeURIComponent(fragment).replace(/%2F/g, "/");
};

describe("Asset image transforms", () => {
  test("width is number", () => {
    const imageBaseUrl = "/asset/image/";
    const loader = createImageLoader({ imageBaseUrl });

    const assetName = "Привет_Мир__2F__BQNEuP8O9N79eVwPfbBJg.webp";
    const result = loader({
      width: 128,
      src: assetName,
      quality: 100,
    });

    const resultUrl = new URL(result, "https://any-domain.any");

    expect(result).toMatchInlineSnapshot(
      `"/asset/image/%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82_%D0%9C%D0%B8%D1%80__2F__BQNEuP8O9N79eVwPfbBJg.webp?width=128&quality=100&format=auto"`
    );

    expect(
      decodePathFragment(resultUrl.pathname.slice(imageBaseUrl.length))
    ).toBe(assetName);
  });

  test("imageBaseUrl is remote", () => {
    const loader = createImageLoader({
      imageBaseUrl: "https://remote-transform-server.xx/asset/image/",
    });

    const result = loader({
      width: 128,
      src: "logo.webp",
      quality: 100,
    });

    expect(result).toMatchInlineSnapshot(
      `"https://remote-transform-server.xx/asset/image/logo.webp?width=128&quality=100&format=auto"`
    );
  });
});

describe("Remote src image transforms", () => {
  test("width is number", () => {
    const imageBaseUrl = "/asset/image/";
    const loader = createImageLoader({ imageBaseUrl });

    const remoteSrc = "https://example.com/lo%3Fgo.webp?a=1";

    const result = loader({
      width: 128,
      src: remoteSrc,
      quality: 100,
    });

    const resultUrl = new URL(result, "https://any-domain.any");

    expect(
      decodePathFragment(resultUrl.pathname.slice(imageBaseUrl.length))
    ).toBe(remoteSrc);

    expect(resultUrl.searchParams.get("width")).toBe("128");

    expect(result).toMatchInlineSnapshot(
      `"/asset/image/https%3A//example.com/lo%253Fgo.webp%3Fa%3D1?width=128&quality=100&format=auto"`
    );
  });

  test("Double encoded fragment", () => {
    const imageBaseUrl = "/asset/image/";
    const loader = createImageLoader({ imageBaseUrl });

    const remoteSrc = encodePathFragment(
      "https://ex%2Fample.com/lo%3Fgo.webp?a=1"
    );

    const result = loader({
      width: 128,
      src: remoteSrc,
      quality: 100,
    });

    const resultUrl = new URL(result, "https://any-domain.any");

    expect(
      decodePathFragment(resultUrl.pathname.slice(imageBaseUrl.length))
    ).toBe(remoteSrc);

    expect(resultUrl.searchParams.get("width")).toBe("128");
  });
});
