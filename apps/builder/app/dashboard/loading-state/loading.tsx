import { useEffect, useState } from "react";
import { Flex, css } from "@webstudio-is/design-system";
import { SvgLoading } from "~/dashboard/loading-state/svg-loading";
import { WebmLoading } from "~/dashboard/loading-state/webm-loading";

const containerStyle = {
  position: "absolute",
  left: "0",
  right: "0",
  top: "0",
  bottom: "0",
};

const lightContainerStyle = css(containerStyle, {
  backgroundColor: "rgb(255 255 255 / 50%);",
});
const darkContainerStyle = css(containerStyle, {
  backgroundColor: "rgb(0 0 0 / 80%);",
});

export const Loading = ({
  type = "webm",
  isDark = false,
  delay = 0,
}: {
  type?: "webm" | "svg";
  isDark?: boolean;
  delay?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // we're using a timeout to avoid showing the loading state for a very short time
    // If the connection is very fast, the user will not see a loading state
    // This is just an idea, we can remove it if we don't like it
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return isVisible ? (
    <Flex
      direction="row"
      justify="center"
      align="center"
      className={isDark ? darkContainerStyle() : lightContainerStyle()}
    >
      {type === "webm" ? <WebmLoading size={100} /> : <SvgLoading size={100} />}
    </Flex>
  ) : null;
};
