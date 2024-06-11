import { Root, Indicator } from "@radix-ui/react-progress";
import { css, theme } from "../stitches.config";
import type { TransitionEventHandler } from "react";

const rootStyle = css({
  width: 200,
  height: 2,
  overflow: "hidden",
  borderRadius: 9999,
  background: "#fff",
  boxShadow: "0 0 32px #4a4efa80",
});

const indicatorStyle = css({
  width: "100%",
  height: "100%",
  background: theme.colors.brandBorderNavbar,
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
