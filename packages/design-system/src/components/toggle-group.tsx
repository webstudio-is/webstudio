/**
 * Implementation of the "Toggle Group" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?type=design&node-id=4-2831&t=9qVuJbUcZqhAI06U-0
 */

import {
  type ComponentProps,
  type ElementRef,
  createContext,
  useContext,
  forwardRef,
} from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { styled, theme, type CSS } from "../stitches.config";
import { IconButton } from "./icon-button";
import { textVariants } from "./text";
import { cssVar } from "../css-var";

type Color = "default" | "preset" | "local" | "remote" | "overwritten";
type ToggleGroupVariant = "framed" | "frameless";

const toggleGroupBackground = `color-mix(in oklab, ${cssVar(
  "--background-primary"
)} 96%, ${cssVar("--foreground-primary")})`;

const ToggleGroupContext = createContext<{
  color?: Color;
  variant?: ToggleGroupVariant;
}>({});

const ToggleGroupRoot = styled(ToggleGroupPrimitive.ToggleGroup, {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  padding: 1,
  background: toggleGroupBackground,
  border: `1px solid ${cssVar("--border-default")}`,
  borderRadius: theme.borderRadius[4],
  variants: {
    variant: {
      framed: {},
      frameless: {
        padding: 0,
        background: "transparent",
        borderColor: "transparent",
        gap: theme.spacing[5],
        "& > button": {
          height: theme.sizes.controlHeight,
          minWidth: theme.sizes.controlHeight,
          paddingInline: theme.spacing[3],
        },
      },
    },
  },
  defaultVariants: {
    variant: "framed",
  },
});

type ToggleGroupProps = ComponentProps<typeof ToggleGroupRoot> & {
  color?: Color;
  variant?: ToggleGroupVariant;
};

export const ToggleGroup = forwardRef<ElementRef<"div">, ToggleGroupProps>(
  (
    {
      color = "default",
      variant = "framed",
      children,
      onValueChange,
      ...props
    },
    ref
  ) => {
    return (
      <ToggleGroupContext.Provider value={{ color, variant }}>
        <ToggleGroupRoot
          ref={ref}
          {...props}
          variant={variant}
          onValueChange={(newValue: string | string[]) => {
            // prevent unselecting buttons when only single can be selected
            if (newValue !== "") {
              onValueChange?.(newValue as string & string[]);
            }
          }}
        >
          {children}
        </ToggleGroupRoot>
      </ToggleGroupContext.Provider>
    );
  }
);

ToggleGroup.displayName = "ToggleGroup";

const IconButtonStyled = styled(IconButton, {
  "&[data-focused=true], &:focus-visible": {
    // To not overlap focus-ring by the next button
    zIndex: 0,
    outline: `1px solid ${cssVar("--border-focus")}`,
    outlineOffset: -1,
  },
  borderWidth: 0,
  flexGrow: 1,
});

const BaseToggleGroupButton = forwardRef<
  ElementRef<"button">,
  ComponentProps<typeof IconButton>
>(({ css, ...props }, ref) => {
  const { color, variant } = useContext(ToggleGroupContext);
  return (
    <IconButtonStyled
      ref={ref}
      {...props}
      variant={
        // default is unselected state
        // when button is selected fallback to preset
        props["aria-checked"] === true
          ? variant === "frameless"
            ? "default"
            : color === "default"
              ? "preset"
              : color
          : "default"
      }
      css={{
        height: theme.spacing[10],
        ...textVariants.labels,
        ...css,
      }}
    />
  );
});

BaseToggleGroupButton.displayName = "BaseToggleGroupButton";

type ToggleGroupButtonProps = ComponentProps<
  typeof ToggleGroupPrimitive.Item
> & { css?: CSS };

export const ToggleGroupButton = forwardRef<
  ElementRef<"button">,
  ToggleGroupButtonProps
>(({ children, ...props }, ref) => {
  return (
    <ToggleGroupPrimitive.Item ref={ref} {...props} asChild>
      <BaseToggleGroupButton>{children}</BaseToggleGroupButton>
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupButton.displayName = "ToggleGroupButton";
