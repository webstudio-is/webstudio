import { parseCssValue } from "@webstudio-is/css-data";
import type { SectionProps } from "../shared/section";

export const transformPanels = [
  "translate",
  "scale",
  "rotate",
  "skew",
  "transformOrigin",
  "backfaceVisibility",
] as const;

export type TransformPanel = (typeof transformPanels)[number];

export type TransformPropertySectionProps = SectionProps & {
  panel: TransformPanel;
  index: number;
};

export const addDefaultsForTransormSection = (props: {
  createBatchUpdate: SectionProps["createBatchUpdate"];
}) => {
  const { createBatchUpdate } = props;
  const batch = createBatchUpdate();

  const translate = parseCssValue("translate", "0px 0px 0px");
  const scale = parseCssValue("scale", "1 1 1");
  const rotateAndSkew = parseCssValue(
    "transform",
    "rotateX(0deg) rotateY(0deg) rotateZ(0deg) skewX(0) skewY(0)"
  );
  const transformOrigin = parseCssValue("transformOrigin", "0% 0%");
  const backfaceVisibility = parseCssValue("backfaceVisibility", "visible");

  batch.setProperty("translate")(translate);
  batch.setProperty("scale")(scale);
  batch.setProperty("transform")(rotateAndSkew);
  batch.setProperty("transformOrigin")(transformOrigin);
  batch.setProperty("backfaceVisibility")(backfaceVisibility);

  batch.publish();
};
