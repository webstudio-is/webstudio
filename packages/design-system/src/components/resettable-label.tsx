import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { ResetIcon } from "@webstudio-is/icons";
import { Label } from "./label";
import { Tooltip } from "./tooltip";
import { Button } from "./button";
import { Flex } from "./flex";
import { Text } from "./text";
import { Kbd } from "./kbd";
import { theme } from "../stitches.config";

export const ResettableLabel = ({
  children,
  color = "default",
  description,
  content,
  onReset,
  resetDisabled = false,
  resetLabel = "Reset value",
  asChild = false,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Label>, "onReset" | "content"> & {
  description?: ReactNode;
  /** Replaces the default tooltip heading and description, not its reset action. */
  content?: ReactNode;
  onReset?: () => void;
  resetDisabled?: boolean;
  resetLabel?: string;
  /** Use an existing label variant, such as SectionTitleLabel. */
  asChild?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const labelRef = useRef<HTMLLabelElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const movingFocus = useRef(false);
  const pointerOverLabel = useRef(false);
  const openedByClick = useRef(false);
  const canReset = onReset !== undefined && !resetDisabled && !disabled;
  const reset = () => {
    if (!canReset) {
      return;
    }
    onReset();
    setOpen(false);
    labelRef.current?.focus();
  };
  const Trigger = asChild ? Slot : Label;
  if (!description && !content && !onReset) {
    return (
      <Flex align="center" css={{ width: "fit-content", maxWidth: "100%" }}>
        <Trigger
          truncate
          {...props}
          ref={labelRef}
          tag="label"
          color={color === "default" ? undefined : color}
          disabled={disabled}
        >
          {children}
        </Trigger>
      </Flex>
    );
  }
  return (
    <Flex align="center" css={{ width: "fit-content", maxWidth: "100%" }}>
      <Tooltip
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && movingFocus.current) {
            return;
          }
          if (!nextOpen && openedByClick.current && pointerOverLabel.current) {
            return;
          }
          setOpen(nextOpen);
        }}
        onEscapeKeyDown={() => {
          setOpen(false);
          labelRef.current?.focus();
        }}
        content={
          <Flex
            direction="column"
            gap="2"
            css={{ maxWidth: theme.spacing[28] }}
          >
            {content ?? (description && <Text>{description}</Text>)}
            {onReset && (
              <Button
                ref={resetRef}
                type="button"
                color="neutral-destructive"
                disabled={!canReset}
                prefix={<ResetIcon />}
                suffix={<Kbd value={["alt", "click"]} color="moreSubtle" />}
                css={{ gridTemplateColumns: "1fr max-content 1fr" }}
                onClick={reset}
                onBlur={() => setOpen(false)}
              >
                {resetLabel}
              </Button>
            )}
          </Flex>
        }
      >
        <Trigger
          truncate
          {...props}
          ref={labelRef}
          color={color}
          disabled={disabled}
          tag={props.htmlFor ? "label" : "button"}
          role="button"
          tabIndex={props.tabIndex ?? 0}
          onPointerEnter={(event) => {
            props.onPointerEnter?.(event);
            pointerOverLabel.current = true;
          }}
          onPointerLeave={(event) => {
            props.onPointerLeave?.(event);
            pointerOverLabel.current = false;
            openedByClick.current = false;
          }}
          onClick={(event) => {
            props.onClick?.(event);
            if (event.defaultPrevented) {
              return;
            }
            event.preventDefault();
            if (event.altKey) {
              event.stopPropagation();
              reset();
              return;
            }
            openedByClick.current = true;
            setOpen(true);
          }}
          onKeyDown={(event) => {
            props.onKeyDown?.(event);
            if (event.defaultPrevented) {
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              if (event.altKey) {
                reset();
              } else {
                setOpen(true);
              }
            }
            if (event.key === "Tab" && !event.shiftKey && open && canReset) {
              event.preventDefault();
              movingFocus.current = true;
              resetRef.current?.focus();
              movingFocus.current = false;
            }
          }}
        >
          {children}
        </Trigger>
      </Tooltip>
    </Flex>
  );
};
