import type { FontWeight } from "@webstudio-is/fonts";
import { $detectedFontsWeights } from "~/shared/nano-states";

const fontWeights: Array<FontWeight> = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
];

// Test a font if it supports a certain weight by rendering it.
// For system fonts we can actually do it.
const testFontWeights = (fontFamily: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 20;
  const context = canvas.getContext("2d");
  const supportedWeights: Array<FontWeight> = ["400"];

  if (context === null) {
    return supportedWeights;
  }

  const weightWidthMap: Map<FontWeight, number> = new Map();

  // Function to render text with a given font weight and measure "inked" pixels
  // We can't just compare the text width using `context.measureText(..).width api` because many monospace
  // fonts have the same width for all weights.
  const measureInkCoverage = (fontWeight: string) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `${fontWeight} 16px ${fontFamily}`;
    context.fillText("abcdefgsw1234567890", 0, 16);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let inkedPixels = 0;
    // Loop through all pixel data and count "inked" pixels (non-transparent ones)
    for (let i = 3; i < pixels.length; i += 4) {
      // Loop through alpha channel
      if (pixels[i] > 0) {
        // If alpha > 0, it's an inked pixel
        inkedPixels++;
      }
    }

    return inkedPixels; // Return the count of inked pixels
  };

  for (const testWeight of fontWeights) {
    weightWidthMap.set(
      testWeight as FontWeight,
      measureInkCoverage(testWeight)
    );
  }

  const compare = (weights: Array<FontWeight>) => {
    const supported: Array<FontWeight> = [];
    for (let index = 0; index < weights.length; index++) {
      const referenceWeight = weights[index];
      const testWeight = weights[index + 1];
      const referenceWidth = weightWidthMap.get(referenceWeight);
      const testWidth = weightWidthMap.get(testWeight);
      // If next width is the same as the previous one, it means the weight is not supported
      if (testWeight && testWidth !== referenceWidth) {
        supported.push(testWeight);
      }
    }
    return supported;
  };

  // 400 is the baseline that's always supported, from there we test in both directions
  // each step must result in a different width to be considered supported
  // if for e.g. 400-300 is compared and has not change in width, it means 300 is not supported
  // then we can then compare 300-200 and so on.
  supportedWeights.push(...compare(["400", "300", "200", "100"]));
  supportedWeights.push(...compare(["400", "500", "600", "700", "800", "900"]));

  return supportedWeights.sort();
};

export const subscribeFontLoadingDone = () => {
  // @todo move it to the call-site
  const abortController = new AbortController();
  document.fonts.addEventListener(
    "loadingdone",
    () => {
      const cache = new Map($detectedFontsWeights.get());
      // We need to re-detect all fonts because we don't know which fonts were loaded.
      for (const [stack] of cache) {
        const supportedWeights = testFontWeights(stack);
        cache.set(stack, supportedWeights);
      }
      $detectedFontsWeights.set(cache);
    },
    { signal: abortController.signal }
  );

  return () => {
    abortController.abort();
  };
};

export const detectSupportedFontWeights = (stack: string) => {
  // Delaying it to potentially have less work done in the previous frame.
  requestAnimationFrame(() => {
    const cache = new Map($detectedFontsWeights.get());
    // Detecting immediately in case its a font that is already loaded, otheriwese
    // it will be detected correctly when the font is loaded and in the meantime the detected
    // value may be incorrect due to the fallback font.
    const supportedWeights = testFontWeights(stack);
    cache.set(stack, supportedWeights);
    $detectedFontsWeights.set(cache);
  });
};
