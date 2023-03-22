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
  "&:hover": {
    background: theme.colors.slate3,
  },
  "& svg": {
    flexGrow: 0,
    marginTop: theme.spacing[7],
    width: 22,
    height: 22,
  },
  variants: {
    state: {
      dragging: {
        background: theme.colors.slate3,
      },
    },
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
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  width: "100%",
});

type ComponentCardProps = {
  label: string;
  icon: JSX.Element;
} & ComponentProps<"div">;

export const ComponentCard = forwardRef<ElementRef<"div">, ComponentCardProps>(
  ({ icon, label, className, ...props }, ref) => {
    return (
      <div className={cardStyle({ className })} ref={ref} {...props}>
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
