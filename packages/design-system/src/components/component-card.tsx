import { forwardRef, type ElementRef, ComponentProps } from "react";
import { textVariants } from "../";
import { css, theme } from "../stitches.config";

const cardStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
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

const textStyle = css({
  display: "flex",
  flexAlign: "center",
  justifyContent: "center",
  flexDirection: "column",
  flexGrow: 0,
  height: "2em",
  width: "100%",
});

const wordStyle = css(textVariants.small, {
  display: "flex",
  flexGrow: 0,
  textAlign: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  width: "100%",
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
        <div className={textStyle()}>
          {label
            .split(/\s/)
            .slice(0, 2)
            .map((word, index) => (
              <span className={wordStyle()} key={index}>
                {word}
              </span>
            ))}
        </div>
      </div>
    );
  }
);

ComponentCard.displayName = "ComponentCard";
