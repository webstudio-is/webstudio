import { forwardRef, type ComponentProps, type ElementRef } from "react";
import {
  markdownAlertVariants,
  type MarkdownAlertVariant,
} from "@webstudio-is/content-engine/markdown-alerts";

export const defaultTag = "div";

type Props = Omit<ComponentProps<typeof defaultTag>, "title"> & {
  variant?: MarkdownAlertVariant;
};

export const Alert = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ variant = "note", className, role = "note", children, ...props }, ref) => {
    const normalizedVariant = Object.hasOwn(markdownAlertVariants, variant)
      ? variant
      : "note";
    return (
      <div
        {...props}
        className={[
          className,
          "markdown-alert",
          `markdown-alert-${normalizedVariant}`,
        ]
          .filter(Boolean)
          .join(" ")}
        role={role}
        data-variant={normalizedVariant}
        ref={ref}
      >
        <p className="markdown-alert-title">
          {markdownAlertVariants[normalizedVariant]}
        </p>
        {children}
      </div>
    );
  }
);

Alert.displayName = "Alert";
