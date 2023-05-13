import { useState } from "react";
import { Flex, css } from "@webstudio-is/design-system";
import { useDebounce } from "use-debounce";
import { SvgLoading } from "~/dashboard/loading-state/svg-loading";

const containerStyle = css({
  position: "absolute",
  left: "0",
  right: "0",
  top: "0",
  bottom: "0",
  background:
    "radial-gradient(34.37% 50% at 50% 50%, rgba(255, 255, 255, 0.5) 0%, rgba(248, 248, 248, 0.5) 100%);",
  backdropFilter: "blur(8px)",
});

export const Loading = ({
  delay = 0,
  size,
}: {
  delay?: number;
  size?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [visible] = useDebounce(isVisible, delay ?? 0);

  if (!isVisible) {
    setIsVisible(true);
  }

  return visible ? (
    <Flex
      direction="row"
      justify="center"
      align="center"
      className={containerStyle()}
    >
      <SvgLoading size={size} />
    </Flex>
  ) : null;
};
