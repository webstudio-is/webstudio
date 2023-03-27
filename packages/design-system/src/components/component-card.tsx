/**
 * Implementation of the "Component Card" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=2608-8921
 */

import { forwardRef, type ElementRef, ComponentProps } from "react";
import { textVariants } from "../";
import { css, theme } from "../stitches.config";

const cardStyle = css({
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  px: theme.spacing[3],
  width: theme.spacing[19],
  height: theme.spacing[19],
  border: `1px solid`,
  borderColor: theme.colors.borderMain,
  borderRadius: theme.borderRadius[2],
  userSelect: "none",
  color: theme.colors.foregroundIconMain,
  cursor: "grab",
  background: theme.colors.backgroundPanel,
  "&:hover, &[data-state=hover]": {
    background: theme.colors.backgroundHover,
  },
  "&[data-state=disabled]": {
    background: theme.colors.backgroundPanel,
    color: theme.colors.foregroundDisabled,
  },
  "&:focus-visible, &[data-state=focus]": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: "-2px",
  },
  "& svg": {
    flexGrow: 0,
    marginTop: theme.spacing[7],
    width: 22,
    height: 22,
  },
});

const textContainerStyle = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  flexGrow: 1,
  width: "100%",
});

const textStyle = css(textVariants.small, {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

type ComponentCardProps = {
  label: string;
  icon: JSX.Element;
  state?: "hover" | "disabled" | "focus";
} & ComponentProps<"div">;

export const ComponentCard = forwardRef<ElementRef<"div">, ComponentCardProps>(
  ({ icon, label, className, state, ...props }, ref) => {
    return (
      <div
        className={cardStyle({ className })}
        ref={ref}
        data-state={state}
        {...props}
      >
        {icon}

        <div className={textContainerStyle()}>
          <div className={textStyle()}>{label}</div>
        </div>
      </div>
    );
  }
);

ComponentCard.displayName = "ComponentCard";
