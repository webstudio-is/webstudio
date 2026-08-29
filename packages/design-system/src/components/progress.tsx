import { Root, Indicator } from "@radix-ui/react-progress";
import { css } from "../stitches.config";
import type { TransitionEventHandler } from "react";
import { cssVar } from "../css-var";

// Fixed Webstudio identity artwork, intentionally independent of the UI theme.
const progressGradient =
  "linear-gradient(90deg, #39fbbb00 0%, #39fbbb 20%, #4a4efa 40.03%, #e63cfe 60.02%, #ffae3c 80.04%, #ffae3c00 100%)";

const rootStyle = css({
  width: 200,
  height: 2,
  overflow: "hidden",
  borderRadius: 9999,
  background: cssVar("--background-primary"),
  boxShadow: "0 0 32px #4a4efa80",
});

const indicatorStyle = css({
  width: "100%",
  height: "100%",
  background: progressGradient,
  transitionDuration: "200ms",
  transitionProperty: "transform",
});

export const Progress = ({
  value,
  transitionDuration,
  onTransitionEnd,
}: {
  value: number;
  transitionDuration?: string;
  onTransitionEnd?: TransitionEventHandler;
}) => {
  return (
    <Root value={value} className={rootStyle()}>
      <Indicator
        className={indicatorStyle()}
        style={{
          transform: `translateX(-${100 - value}%)`,
          transitionDuration,
        }}
        onTransitionEnd={onTransitionEnd}
      />
    </Root>
  );
};
