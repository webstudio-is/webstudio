import type { KeywordValue } from "@webstudio-is/css-engine";
import { Label } from "@webstudio-is/design-system";

type TransitionTimingProps = {
  timing: KeywordValue;
};

export const TransitionTiming = ({ timing }: TransitionTimingProps) => {
  return (
    <>
      <Label>Timing</Label>
    </>
  );
};
