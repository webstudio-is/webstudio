import { styled } from "../stitches.config";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Text } from "./text";

export const Label = styled(LabelPrimitive.Root, Text, {
  display: "inline-block",
  verticalAlign: "middle",
  cursor: "default",
  lineHeight: 1.5,
});
