import type { ProgressProps } from "@radix-ui/react-progress";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { styled, theme } from "../stitches.config";

const ProgressRoot = styled(ProgressPrimitive.Root, {
  width: "100%",
  height: "100%",
  borderRadius: theme.borderRadius[4],
});

const Indicator = styled(ProgressPrimitive.Indicator, {
  height: "100%",
  color: "currentColor",
});

export const Progress = ({ value, max = 100, ...props }: ProgressProps) => {
  const percentage = value != null ? Math.round((value / max) * 100) : 0;
  return (
    <ProgressRoot value={value} max={max} {...props}>
      <Indicator style={{ width: `${percentage}%` }} />
    </ProgressRoot>
  );
};

Progress.displayName = "Progress";
