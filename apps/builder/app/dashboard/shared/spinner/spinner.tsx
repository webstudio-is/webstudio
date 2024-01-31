import { css } from "@webstudio-is/design-system";
import { useDebounce } from "use-debounce";
import { SpinnerIcon } from "@webstudio-is/icons";

const containerStyle = css({
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(34.37% 50% at 50% 50%, rgba(255, 255, 255, 0.5) 0%, rgba(248, 248, 248, 0.5) 100%);",
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
  setIsVisible(true);

  if (isVisible === false) {
    return null;
  }

  return (
    <div className={containerStyle()}>
      <SpinnerIcon size={size} />
    </div>
  );
};
