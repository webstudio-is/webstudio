import { Root, Indicator } from "@radix-ui/react-progress";
import { css, type CSS } from "../stitches.config";
import type { TransitionEventHandler } from "react";
import { cssVar } from "../css-var";

const rootStyle = css({
  width: 200,
  height: 2,
  overflow: "hidden",
  borderRadius: 9999,
  background: cssVar("--background-secondary"),
});

const indicatorStyle = css({
  width: "100%",
  height: "100%",
  background: cssVar("--background-accent"),
  transitionDuration: "200ms",
  transitionProperty: "transform",
});

export const Progress = ({
  value,
  transitionDuration,
  onTransitionEnd,
  css,
  indicatorCss,
}: {
  value: number;
  transitionDuration?: string;
  onTransitionEnd?: TransitionEventHandler;
  css?: CSS;
  indicatorCss?: CSS;
}) => {
  return (
    <Root value={value} className={rootStyle({ css })}>
      <Indicator
        className={indicatorStyle({ css: indicatorCss })}
        style={{
          transform: `translateX(-${100 - value}%)`,
          transitionDuration,
        }}
        onTransitionEnd={onTransitionEnd}
      />
    </Root>
  );
};
