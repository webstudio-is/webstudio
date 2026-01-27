import { describe, test, expect } from "vitest";
import { getImageAttributes } from "./image-optimize";
import { wsImageLoader } from "./image-loaders";

describe("Image optimizations applied", () => {
  test("width is number, create pixel density descriptor 'x'", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: 100,
      src: "logo.webp",
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: wsImageLoader,
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "100vw",
        "src": "/cgi/image/logo.webp?width=256&quality=100&format=auto",
        "srcSet": "/cgi/image/logo.webp?width=16&quality=100&format=auto 16w, /cgi/image/logo.webp?width=32&quality=100&format=auto 32w, /cgi/image/logo.webp?width=48&quality=100&format=auto 48w, /cgi/image/logo.webp?width=64&quality=100&format=auto 64w, /cgi/image/logo.webp?width=96&quality=100&format=auto 96w, /cgi/image/logo.webp?width=128&quality=100&format=auto 128w, /cgi/image/logo.webp?width=256&quality=100&format=auto 256w",
      }
    `);
  });

  test("width is number, url is absolute, create pixel density descriptor 'x'", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: 100,
      src: "https://webstudio.is/logo.webp",
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: wsImageLoader,
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "100vw",
        "src": "/cgi/image/https%3A//webstudio.is/logo.webp?width=256&quality=100&format=auto",
        "srcSet": "/cgi/image/https%3A//webstudio.is/logo.webp?width=16&quality=100&format=auto 16w, /cgi/image/https%3A//webstudio.is/logo.webp?width=32&quality=100&format=auto 32w, /cgi/image/https%3A//webstudio.is/logo.webp?width=48&quality=100&format=auto 48w, /cgi/image/https%3A//webstudio.is/logo.webp?width=64&quality=100&format=auto 64w, /cgi/image/https%3A//webstudio.is/logo.webp?width=96&quality=100&format=auto 96w, /cgi/image/https%3A//webstudio.is/logo.webp?width=128&quality=100&format=auto 128w, /cgi/image/https%3A//webstudio.is/logo.webp?width=256&quality=100&format=auto 256w",
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
      loader: wsImageLoader,
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "(min-width: 1280px) 50vw, 100vw",
        "src": "/cgi/image/logo.webp?width=3840&quality=90&format=auto",
        "srcSet": "/cgi/image/logo.webp?width=384&quality=90&format=auto 384w, /cgi/image/logo.webp?width=640&quality=90&format=auto 640w, /cgi/image/logo.webp?width=750&quality=90&format=auto 750w, /cgi/image/logo.webp?width=828&quality=90&format=auto 828w, /cgi/image/logo.webp?width=1080&quality=90&format=auto 1080w, /cgi/image/logo.webp?width=1200&quality=90&format=auto 1200w, /cgi/image/logo.webp?width=1920&quality=90&format=auto 1920w, /cgi/image/logo.webp?width=2048&quality=90&format=auto 2048w, /cgi/image/logo.webp?width=3840&quality=90&format=auto 3840w",
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
      loader: wsImageLoader,
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "100vw",
        "src": "/cgi/image/logo.webp?width=3840&quality=70&format=auto",
        "srcSet": "/cgi/image/logo.webp?width=640&quality=70&format=auto 640w, /cgi/image/logo.webp?width=750&quality=70&format=auto 750w, /cgi/image/logo.webp?width=828&quality=70&format=auto 828w, /cgi/image/logo.webp?width=1080&quality=70&format=auto 1080w, /cgi/image/logo.webp?width=1200&quality=70&format=auto 1200w, /cgi/image/logo.webp?width=1920&quality=70&format=auto 1920w, /cgi/image/logo.webp?width=2048&quality=70&format=auto 2048w, /cgi/image/logo.webp?width=3840&quality=70&format=auto 3840w",
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
      loader: wsImageLoader,
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "sizes": "100vw",
        "src": "/cgi/image/logo.webp?width=3840&quality=70&format=auto",
        "srcSet": "/cgi/image/logo.webp?width=640&quality=70&format=auto 640w, /cgi/image/logo.webp?width=750&quality=70&format=auto 750w, /cgi/image/logo.webp?width=828&quality=70&format=auto 828w, /cgi/image/logo.webp?width=1080&quality=70&format=auto 1080w, /cgi/image/logo.webp?width=1200&quality=70&format=auto 1200w, /cgi/image/logo.webp?width=1920&quality=70&format=auto 1920w, /cgi/image/logo.webp?width=2048&quality=70&format=auto 2048w, /cgi/image/logo.webp?width=3840&quality=70&format=auto 3840w",
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
      loader: (props) =>
        `${new URL(props.src).pathname}?w=${
          props.format !== "raw" ? props.width : 0
        }&q=${props.format !== "raw" ? props.quality : 0}`,
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
      src: "logo.webp",
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: wsImageLoader,
    });

    expect(imgAttr).toMatchInlineSnapshot(`
      {
        "src": "/cgi/image/logo.webp?format=raw",
      }
    `);
  });

  test("optimize is false and url absolute", () => {
    const imgAttr = getImageAttributes({
      optimize: false,
      width: 100,
      src: "https://webstudio.is/logo.webp",
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: wsImageLoader,
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
      loader: wsImageLoader,
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
      loader: wsImageLoader,
    });

    expect(imgAttr).toMatchInlineSnapshot(`undefined`);
  });

  test("src is undefined", () => {
    const imgAttr = getImageAttributes({
      optimize: true,
      width: 100,
      src: undefined,
      srcSet: undefined,
      sizes: undefined,
      quality: 100,
      loader: wsImageLoader,
    });

    expect(imgAttr).toMatchInlineSnapshot(`undefined`);
  });
});
