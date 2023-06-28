import { cssVars } from "@webstudio-is/css-vars";
import {
  css,
  DropdownMenuTrigger,
  rawTheme,
  toggleItemStyle,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, WebstudioIcon } from "@webstudio-is/icons";

const size = rawTheme.spacing[9];

const containerTransformVar = cssVars.define("container-transform");

const triggerStyle = css({
  position: "relative",
  span: {
    transformOrigin: "bottom center",
    transition: "all 150ms ease",
    color: "$foregroundTextMoreSubtle",
  },
  "span:nth-child(1)": {
    marginRight: "2px",
  },
  "&:hover span:nth-child(2), &[data-state=open] span:nth-child(2)": {
    transform: "translateY(2px)",
    color: "$foregroundContrastMain",
  },
});

const innerContainerStyle = css({
  width: "100%",
  height: "100%",
  transformStyle: "preserve-3d",
  transition: "all 150ms ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const faceStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const MenuButton = () => {
  return (
    <DropdownMenuTrigger
      className={toggleItemStyle({ className: triggerStyle() })}
      aria-label="Menu Button"
    >
      <span className={innerContainerStyle()}>
        <span className={faceStyle()}>
          <WebstudioIcon width="22" height="22" />
        </span>
        <span className={faceStyle()}>
          <ChevronDownIcon width="16" />
        </span>
      </span>
    </DropdownMenuTrigger>
  );
};
