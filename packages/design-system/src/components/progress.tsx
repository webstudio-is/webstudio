import { Root, Indicator } from "@radix-ui/react-progress";
import { css } from "../stitches.config";
import type { TransitionEventHandler } from "react";
import { cssVar } from "../css-var";

const transparent = (color: string) => `oklch(from ${color} l c h / 0%)`;
const accent = cssVar("--background-accent");
const green = `oklch(from ${accent} l c calc(h - 130))`;
const purple = `oklch(from ${accent} l c calc(h + 45))`;
const orange = `oklch(from ${accent} l c calc(h + 145))`;

const rootStyle = css({
  width: 200,
  height: 2,
  overflow: "hidden",
  borderRadius: 9999,
  background: cssVar("--background-primary"),
  boxShadow: `0 0 32px oklch(from ${accent} l c h / 50%)`,
});

const indicatorStyle = css({
  width: "100%",
  height: "100%",
  background: `linear-gradient(90deg, ${transparent(
    green
  )} 0%, ${green} 20%, ${accent} 40%, ${purple} 60%, ${orange} 80%, ${transparent(
    orange
  )} 100%)`,
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
