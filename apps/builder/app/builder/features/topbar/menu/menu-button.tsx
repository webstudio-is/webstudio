import {
  css,
  DropdownMenuTrigger,
  rawTheme,
  toggleItemStyle,
} from "@webstudio-is/design-system";
import { HamburgerMenuIcon, WebstudioIcon } from "@webstudio-is/icons";

const size = rawTheme.spacing[9];

const containerTransformVar = "--ws-menu-button-container-transform";

const triggerStyle = css({
  position: "relative",
  [containerTransformVar]: `translateZ(-${size}) rotateY(0deg)`,
  "&[data-state=open], &:hover": {
    [containerTransformVar]: `translateZ(-${size}) rotateY(-90deg)`,
  },
});

const innerContainerStyle = css({
  width: "100%",
  height: "100%",
  transformStyle: "preserve-3d",
  transition: "transform 200ms",
  transform: `var(${containerTransformVar})`,
});

const faceStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "absolute",
  width: "100%",
  height: "100%",
  variants: {
    front: {
      true: {
        transform: `rotateY(0deg) translateZ(${size})`,
      },
    },
    back: {
      true: {
        transform: `rotateY(90deg) translateZ(${size})`,
      },
    },
  },
});

export const MenuButton = () => {
  return (
    <DropdownMenuTrigger
      className={toggleItemStyle({ className: triggerStyle() })}
      aria-label="Menu Button"
    >
      <span className={innerContainerStyle()}>
        <span className={faceStyle({ front: true })}>
          <WebstudioIcon width="22" height="22" />
        </span>
        <span className={faceStyle({ back: true })}>
          <HamburgerMenuIcon size={22} />
        </span>
      </span>
    </DropdownMenuTrigger>
  );
};
