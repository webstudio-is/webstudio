import { cssVar } from "./css-var";

const background = cssVar("--background-primary");

// Brand glows stay fixed; the neutral base and highlight follow the theme.
export const webstudioBrand = {
  backgroundGradient: [
    `radial-gradient(65.88% 47.48% at 50% 50%, oklch(from ${background} calc(l * 0.85 + 0.07) c h) 0%, oklch(from ${background} calc(l * 0.85 + 0.07) c h / 0) 100%)`,
    "linear-gradient(180deg, #ffae3c00 0%, #e63cfe54 100%)",
    "radial-gradient(211.58% 161.63% at 3.13% 100%, #ffae3c4d 0%, #e335ff00 100%)",
    "radial-gradient(107.1% 32.15% at 92.96% 5.04%, #35ffb64d 0%, #4a4efa4d 100%)",
    `oklch(from ${background} calc(l * 0.8 + 0.08) c h)`,
  ].join(", "),
  progressGradient:
    "linear-gradient(90deg, #39fbbb00 0%, #39fbbb 20%, #4a4efa 40.03%, #e63cfe 60.02%, #ffae3c 80.04%, #ffae3c00 100%)",
  progressShadow: "0 0 32px #4a4efa80",
} as const;
