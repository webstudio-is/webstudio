import { styled } from "../../stitches.config";
import * as LabelPrimitive from "@radix-ui/react-label";
import { DeprecatedText2 } from "./text2";

export const DeprecatedLabel = styled(LabelPrimitive.Root, DeprecatedText2, {
  display: "inline-block",
  verticalAlign: "middle",
  cursor: "default",
  lineHeight: 1.5,
});
