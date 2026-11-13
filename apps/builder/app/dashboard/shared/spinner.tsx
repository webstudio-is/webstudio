import { css, cssVar } from "@webstudio-is/design-system";
import { useDebounce } from "use-debounce";
import { SpinnerIcon } from "@webstudio-is/icons";
import { useEffect } from "react";

const containerStyle = css({
  position: "absolute",
  inset: 0,
  background: `radial-gradient(
    34.37% 50% at 50% 50%,
    oklch(from ${cssVar("--background-primary")} l c h / 50%) 0%,
    oklch(from ${cssVar("--background-disabled")} l c h / 50%) 100%
  )`,
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const Spinner = ({
  delay = 600,
  size = 64,
}: {
  delay?: number;
  size?: number;
}) => {
  const [isVisible, setIsVisible] = useDebounce(false, delay);

  useEffect(() => {
    setIsVisible(true);
  }, [setIsVisible]);

  if (isVisible === false) {
    return;
  }

  return (
    <div className={containerStyle()}>
      <SpinnerIcon size={size} />
    </div>
  );
};
