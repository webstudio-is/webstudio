import { styled } from "../stitches.config";
import * as LabelPrimitive from "@radix-ui/react-label";
import { TextLegacy } from "./text-legacy";

export const Label = styled(LabelPrimitive.Root, TextLegacy, {
  display: "inline-block",
  verticalAlign: "middle",
  cursor: "default",
  lineHeight: 1.5,
});
