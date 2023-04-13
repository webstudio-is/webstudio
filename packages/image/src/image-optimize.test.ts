import { describe, test, expect } from "@jest/globals";
import { getImageAttributes } from "./image-optimize";
import { cloudflareImageLoader } from "./image-loaders";

describe("Image optimizations applied", () => {
  test("width is number, create pixel density descriptor 'x'", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: 100,
      src: "logo.webp",
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: cloudflareImageLoader({
        resizeOrigin: null,
        cdnUrl: "https://webstudio.is/",
      }),
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": undefined,
        "src": "/cdn-cgi/image/width=256,quality=100,format=auto/https://webstudio.is/logo.webp",
        "srcSet": "/cdn-cgi/image/width=128,quality=100,format=auto/https://webstudio.is/logo.webp 1x, /cdn-cgi/image/width=256,quality=100,format=auto/https://webstudio.is/logo.webp 2x",
      }
    `);
  });

  test("width is undefined, create 'w' descriptor and sizes prop", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: undefined,
      src: "logo.webp",
      srcSet: undefined,
      sizes: undefined,
      quality: 90,
      loader: cloudflareImageLoader({
        resizeOrigin: null,
        cdnUrl: "https://webstudio.is/",
      }),
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "(min-width: 1280px) 50vw, 100vw",
        "src": "/cdn-cgi/image/width=3840,quality=90,format=auto/https://webstudio.is/logo.webp",
        "srcSet": "/cdn-cgi/image/width=384,quality=90,format=auto/https://webstudio.is/logo.webp 384w, /cdn-cgi/image/width=640,quality=90,format=auto/https://webstudio.is/logo.webp 640w, /cdn-cgi/image/width=750,quality=90,format=auto/https://webstudio.is/logo.webp 750w, /cdn-cgi/image/width=828,quality=90,format=auto/https://webstudio.is/logo.webp 828w, /cdn-cgi/image/width=1080,quality=90,format=auto/https://webstudio.is/logo.webp 1080w, /cdn-cgi/image/width=1200,quality=90,format=auto/https://webstudio.is/logo.webp 1200w, /cdn-cgi/image/width=1920,quality=90,format=auto/https://webstudio.is/logo.webp 1920w, /cdn-cgi/image/width=2048,quality=90,format=auto/https://webstudio.is/logo.webp 2048w, /cdn-cgi/image/width=3840,quality=90,format=auto/https://webstudio.is/logo.webp 3840w",
      }
    `);
  });

  test("width is undefined and size defined, creates 'w' descriptor and use input sizes props", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: undefined,
      src: "logo.webp",
      srcSet: undefined,
      sizes: "100vw",
      quality: 70,
      loader: cloudflareImageLoader({
        resizeOrigin: null,
        cdnUrl: "https://webstudio.is/",
      }),
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "100vw",
        "src": "/cdn-cgi/image/width=3840,quality=70,format=auto/https://webstudio.is/logo.webp",
        "srcSet": "/cdn-cgi/image/width=640,quality=70,format=auto/https://webstudio.is/logo.webp 640w, /cdn-cgi/image/width=750,quality=70,format=auto/https://webstudio.is/logo.webp 750w, /cdn-cgi/image/width=828,quality=70,format=auto/https://webstudio.is/logo.webp 828w, /cdn-cgi/image/width=1080,quality=70,format=auto/https://webstudio.is/logo.webp 1080w, /cdn-cgi/image/width=1200,quality=70,format=auto/https://webstudio.is/logo.webp 1200w, /cdn-cgi/image/width=1920,quality=70,format=auto/https://webstudio.is/logo.webp 1920w, /cdn-cgi/image/width=2048,quality=70,format=auto/https://webstudio.is/logo.webp 2048w, /cdn-cgi/image/width=3840,quality=70,format=auto/https://webstudio.is/logo.webp 3840w",
      }
    `);
  });

  test("width is undefined and size defined, creates 'w' descriptor and use input sizes props, resizeOrigin defined", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: undefined,
      src: "logo.webp",
      srcSet: undefined,
      sizes: "100vw",
      quality: 70,
      loader: cloudflareImageLoader({
        resizeOrigin: "https://resize-origin.is",
        cdnUrl: "https://webstudio.is/",
      }),
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "100vw",
        "src": "https://resize-origin.is/cdn-cgi/image/width=3840,quality=70,format=auto/https://webstudio.is/logo.webp",
        "srcSet": "https://resize-origin.is/cdn-cgi/image/width=640,quality=70,format=auto/https://webstudio.is/logo.webp 640w, https://resize-origin.is/cdn-cgi/image/width=750,quality=70,format=auto/https://webstudio.is/logo.webp 750w, https://resize-origin.is/cdn-cgi/image/width=828,quality=70,format=auto/https://webstudio.is/logo.webp 828w, https://resize-origin.is/cdn-cgi/image/width=1080,quality=70,format=auto/https://webstudio.is/logo.webp 1080w, https://resize-origin.is/cdn-cgi/image/width=1200,quality=70,format=auto/https://webstudio.is/logo.webp 1200w, https://resize-origin.is/cdn-cgi/image/width=1920,quality=70,format=auto/https://webstudio.is/logo.webp 1920w, https://resize-origin.is/cdn-cgi/image/width=2048,quality=70,format=auto/https://webstudio.is/logo.webp 2048w, https://resize-origin.is/cdn-cgi/image/width=3840,quality=70,format=auto/https://webstudio.is/logo.webp 3840w",
      }
    `);
  });

  test("custom loader", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: undefined,
      src: "https://webstudio.is/logo.webp",
      srcSet: undefined,
      sizes: "100vw",
      quality: 70,
      loader: ({ width, src, quality }) =>
        `${new URL(src).pathname}?w=${width}&q=${quality}`,
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "100vw",
        "src": "/logo.webp?w=3840&q=70",
        "srcSet": "/logo.webp?w=640&q=70 640w, /logo.webp?w=750&q=70 750w, /logo.webp?w=828&q=70 828w, /logo.webp?w=1080&q=70 1080w, /logo.webp?w=1200&q=70 1200w, /logo.webp?w=1920&q=70 1920w, /logo.webp?w=2048&q=70 2048w, /logo.webp?w=3840&q=70 3840w",
      }
    `);
  });
});

describe("Image optimizations not applied", () => {
  test("optimize is false", () => {
    const imgAttr = getImageAttributes({
      optimize: false,
      width: 100,
      src: "https://webstudio.is/logo.webp",
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: cloudflareImageLoader({ resizeOrigin: null }),
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "src": "https://webstudio.is/logo.webp",
      }
    `);
  });

  test("srcSet is defined", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: 100,
      src: "https://webstudio.is/logo.webp",
      srcSet: "user-defined-srcset",
      sizes: undefined,
      quality: 100,
      loader: cloudflareImageLoader({ resizeOrigin: null }),
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "src": "https://webstudio.is/logo.webp",
        "srcSet": "user-defined-srcset",
      }
    `);
  });

  test("src is empty", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: 100,
      src: "",
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: cloudflareImageLoader({ resizeOrigin: null }),
    });

    expect(imgAttr).toMatchInlineSnapshot(`null`);
  });

  test("src is undefined", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: 100,
      src: undefined,
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: cloudflareImageLoader({ resizeOrigin: null }),
    });

    expect(imgAttr).toMatchInlineSnapshot(`null`);
  });
});
