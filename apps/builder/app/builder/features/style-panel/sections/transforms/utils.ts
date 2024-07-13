import { parseCssValue } from "@webstudio-is/css-data";
import type { SectionProps } from "../shared/section";
import type {
  StyleValue,
  TupleValue,
  TupleValueItem,
  UnitValue,
} from "@webstudio-is/css-engine";
import type { SetProperty } from "../../shared/use-style-data";
import type { StyleInfo } from "../../shared/style-info";

export type TransformFloatingPanelContentProps = {
  currentStyle: StyleInfo;
  setProperty: SetProperty;
};

export const transformPanels = [
  "translate",
  "scale",
  "rotate",
  "skew",
  "transformOrigin",
  "backfaceVisibility",
] as const;

export type TransformPanel = (typeof transformPanels)[number];

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

export const isUnitValue = (value: StyleValue): value is UnitValue => {
  return value?.type === "unit" ? true : false;
};

export const updateTupleProperty = (
  index: number,
  newValue: TupleValueItem,
  value: TupleValue
): TupleValue => {
  const newArray: TupleValueItem[] = [...value.value];
  newArray.splice(index, 1, newValue);
  return {
    type: "tuple",
    value: newArray,
  };
};
