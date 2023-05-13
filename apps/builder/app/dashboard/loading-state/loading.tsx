import { useEffect, useState } from "react";
import { Flex, css } from "@webstudio-is/design-system";
import spinner from "./spinner.svg";

const containerStyle = css({
  position: "absolute",
  left: "0",
  right: "0",
  top: "0",
  bottom: "0",
  background:
    "radial-gradient(34.37% 50% at 50% 50%, rgba(255, 255, 255, 0.5) 0%, rgba(248, 248, 248, 0.5) 100%);",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const Loading = ({ delay = 0 }: { delay?: number }) => {
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
      className={containerStyle()}
    >
      <img src={spinner} alt="Loading" width={64} height={64} />
    </Flex>
  ) : null;
};
