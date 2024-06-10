import { Root, Indicator } from "@radix-ui/react-progress";
import { css, theme } from "../stitches.config";

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
  transitionDuration: "1000ms",
  transitionProperty: "transform",
});

export const Progress = ({
  value,
  transitionDuration,
}: {
  value: number;
  transitionDuration?: string;
}) => {
  return (
    <Root value={value} className={rootStyle()}>
      <Indicator
        className={indicatorStyle()}
        style={{
          transform: `translateX(-${100 - value}%)`,
          transitionDuration,
        }}
      />
    </Root>
  );
};
