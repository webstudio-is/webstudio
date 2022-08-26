import { styled } from "../stitches.config";
import * as LabelPrimitive from "@radix-ui/react-label";
import { __DEPRECATED__Text } from "./__DEPRECATED__/text";

export const Label = styled(LabelPrimitive.Root, __DEPRECATED__Text, {
  display: "inline-block",
  verticalAlign: "middle",
  cursor: "default",
  lineHeight: 1.5,
});
