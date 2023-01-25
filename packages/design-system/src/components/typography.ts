import { css } from "../stitches.config";
import { typography as figmaTypography } from "../__generated__/figma-design-tokens";

type TypographyCss = Record<
  keyof typeof figmaTypography,
  ReturnType<typeof css>
>;

const partialTypography: Partial<TypographyCss> = {};
const keys = Object.keys(figmaTypography) as (keyof typeof figmaTypography)[];
for (const key of keys) {
  partialTypography[key] = css(figmaTypography[key]);
}

export const typography = partialTypography as TypographyCss;
