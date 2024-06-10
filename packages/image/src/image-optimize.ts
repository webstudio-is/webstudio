/**
 * # Responsive Image component helpers.
 *
 * ## Quick summary about img srcset and sizes attributes:
 *
 * There are 2 ways to define what image will be loaded in the img property srcset.
 *
 * 1. via pixel density descriptor 'x', like `srcset="photo-small.jpg 1x, photo-medium.jpg 1.5x, photo-huge.jpg 2x"`
 *   src will be selected depending on `device-pixel-ratio`.
 *
 * 2. via viewport width descriptor 'w' and sizes property containing source size descriptors, like
 *   `srcset="photo-small.jpg 320w, photo-medium.jpg 640w, photo-huge.jpg 1280w"`
 *   `sizes="(max-width: 600px) 400px, (max-width: 1200px) 70vw, 50vw"`
 *
 *   The browser finds the first matching media query from source size descriptors,
 *   then use source size value to generate internally srcset
 *   with pixel density descriptors dividing width descriptor value by source size value.
 *
 *   Using the example above for viewport width 800px.
 *   The first matching media query is (max-width: 1200px)
 *   source size value is 70vw  equal to 800px * 0,7 = 560px
 *
 *   browser internal srcset will be (we divide `w` descriptor by source size value):
 *   photo-small.jpg 320w/560px, photo-medium.jpg 640w/560px, photo-huge.jpg 1280w/560px =>
 *   photo-small.jpg 0.57x, photo-medium.jpg 1.14x, photo-huge.jpg 2.28x
 *
 *   Finally same rules as for pixel density descriptor 'x' are applied.
 *
 * ## Algorithm (without optimizations):
 *
 * We have a predefined array of all supported image sizes allSizes, this is the real width of an image in pixels.
 * This is good for caching, as we can cache image with specific width and then use it for different devices.
 *
 * > allSizes array is a tradeoff between cache and the best possible image size you deliver to the user.
 * > If allSizes.length is too small, you will deliver too big images to the user,
 * > if allSizes.length is too big, you will have many caches misses.
 *
 * If img has a defined width property.
 *   1. filter allSizes to exclude loading images higher that maxDevicePixelRatio * img.width
 *
 *
 * If img has no defined width property.
 *   1. Generate srcset = allSizes.map((w) => `${getImageSrcAtWidth(w)} ${w}w`)
 *   2. Use sizes property, or if it is not defined use opinionated DEFAULT_SIZES = "(min-width: 1280px) 50vw, 100vw";
 *
 * Optimizations applied now:
 *
 * - If the sizes property is defined, we can exclude from `srcsets` all images
 *   which are smaller than the `smallestRatio * smallesDeviceSize`
 *
 * Future (not implemented) optimizations and improvements:
 *
 * - Knowing image size on different viewport widths we can provide nondefault sizes property
 * - Knowledge of Image aspect-ratio would allow cropping images serverside.
 * - Early hints for high priority images https://blog.cloudflare.com/early-hints/
 * - Slow networks optimizations
 * - 404 etc processing with CSS - https://bitsofco.de/styling-broken-images/ (has some opinionated issues) or js solution with custom user fallback.
 *
 * # Attributions
 *
 * The MIT License (MIT)
 *
 * applies to:
 *
 * - https://github.com/vercel/next.js, Copyright (c) 2022 Vercel, Inc.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2022 Vercel, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies
 * or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 **/

export type ImageLoader = (
  props:
    | {
        width: number;
        quality: number;
        src: string;
        format?: "auto";
        height?: number;
        fit?: "pad";
      }
    | { src: string; format: "raw" }
) => string;

/**
 * max(...imageSizes) must be less then min(...deviceSizes)
 **/
const imageSizes = [16, 32, 48, 64, 96, 128, 256, 384];
const deviceSizes = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

export const allSizes = [...imageSizes, ...deviceSizes];

/**
 * https://github.com/vercel/next.js/blob/canary/packages/next/client/image.tsx
 **/
const getWidths = (
  width: number | undefined,
  sizes: string | undefined
): { widths: number[]; kind: "w" | "x" } => {
  if (sizes) {
    // Find all the "vw" percent sizes used in the sizes prop
    const viewportWidthRe = /(^|\s)(1?\d?\d)vw/g;
    const percentSizes = [];
    for (let match; (match = viewportWidthRe.exec(sizes)); match) {
      percentSizes.push(Number.parseInt(match[2], 10));
    }

    if (percentSizes.length) {
      // we can exclude from srcSets all images which are smaller than the smallestRatio * smallesDeviceSize
      const smallestRatio = Math.min(...percentSizes) * 0.01;
      return {
        widths: allSizes.filter(
          (size) => size >= deviceSizes[0] * smallestRatio
        ),
        kind: "w",
      };
    }
    return { widths: allSizes, kind: "w" };
  }

  if (width == null) {
    return { widths: deviceSizes, kind: "w" };
  }

  // Max device pixel ratio capped at 2; higher ratios offer negligible benefits
  // See Twitter Engineering's article on capping image fidelity: https://blog.twitter.com/engineering/en_us/topics/infrastructure/2019/capping-image-fidelity-on-ultra-high-resolution-devices.html
  const MAX_DEVICE_PIXEL_RATIO = 2;

  let index = allSizes.findIndex(
    (size) => size >= MAX_DEVICE_PIXEL_RATIO * width
  );
  index = index < 0 ? allSizes.length : index;

  return {
    widths: allSizes.slice(0, index + 1),
    kind: "w",
  };

  /*
  // Leave it here for future optimisations - icon like images

  const widths = [
    ...new Set(
      [width, width * 2].map(
        (w) => allSizes.find((p) => p >= w) || allSizes[allSizes.length - 1]
      )
    ),
  ];
  return { widths, kind: "x" };
  */
};

const generateImgAttrs = ({
  src,
  width,
  quality,
  sizes,
  loader,
}: {
  src: string;
  quality: number;
  width: number | undefined;
  sizes: string | undefined;
  loader: ImageLoader;
}): {
  src: string;
  srcSet: string | undefined;
  sizes: string | undefined;
} => {
  const { widths, kind } = getWidths(width, sizes);

  return {
    sizes: !sizes && kind === "w" ? "100vw" : sizes,
    srcSet: widths
      .map(
        (w, i) =>
          `${loader({ src, quality, width: w })} ${
            kind === "w" ? w : i + 1
          }${kind}`
      )
      .join(", "),

    // Must be last, to prevent Safari to load images twice
    src: loader({
      src,
      quality,
      width: widths[widths.length - 1],
    }),
  };
};

const getInt = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const vNum = Number.parseFloat(value);

    if (!Number.isNaN(vNum)) {
      return Math.round(vNum);
    }
  }

  return undefined;
};

/**
 * DEFAULT_SIZES Just an assumption that most images (except hero and icons) are 100% wide on mobile and 50% on desktop.
 * For icons width are usually set explicitly so DEFAULT_SIZES is not applied.
 * For hero images, we can allow in UI to select sizes=100vw explicitly.
 * Anyway, the best would be to calculate this based on canvas data from different breakpoints.
 * See ../component-utils/image for detailed description
 **/
const DEFAULT_SIZES = "(min-width: 1280px) 50vw, 100vw";

const DEFAULT_QUALITY = 80;

export const getImageAttributes = (props: {
  src: string | undefined;
  srcSet: string | undefined;
  sizes: string | undefined;
  width: string | number | undefined;
  quality: string | number | undefined;
  loader: ImageLoader;
  optimize: boolean;
}):
  | {
      src: string;
      srcSet?: string;
      sizes?: string;
    }
  | undefined => {
  const width = getInt(props.width);
  const quality = Math.max(
    Math.min(getInt(props.quality) ?? DEFAULT_QUALITY, 100),
    0
  );

  if (props.src != null && props.src !== "") {
    if (props.srcSet == null && props.optimize) {
      const sizes =
        props.sizes ?? (props.width == null ? DEFAULT_SIZES : undefined);

      return generateImgAttrs({
        src: props.src,
        width,
        quality,
        sizes,
        loader: props.loader,
      });
    }

    const resAttrs: {
      src: string;
      srcSet?: string;
      sizes?: string;
    } = { src: props.src };

    if (props.srcSet != null) {
      resAttrs.srcSet = props.srcSet;
    }

    if (props.sizes != null) {
      resAttrs.sizes = props.sizes;
    }

    return resAttrs;
  }
};
