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
import { styled, theme } from "../stitches.config";
import { IconButton } from "./icon-button";
import { textVariants } from "./text";

type Color = "default" | "preset" | "local" | "remote" | "overwritten";

const ToggleGroupContext = createContext<{
  color?: Color;
}>({});

type ToggleGroupProps = ComponentProps<
  typeof ToggleGroupPrimitive.ToggleGroup
> & {
  color?: Color;
};

const BaseToggleGroup = forwardRef<ElementRef<"div">, ToggleGroupProps>(
  ({ color = "default", children, onValueChange, ...props }, ref) => {
    return (
      <ToggleGroupContext.Provider value={{ color }}>
        <ToggleGroupPrimitive.ToggleGroup
          ref={ref}
          {...props}
          onValueChange={(newValue: string | string[]) => {
            // prevent unselecting buttons when only single can be selected
            if (newValue !== "") {
              onValueChange?.(newValue as string & string[]);
            }
          }}
        >
          {children}
        </ToggleGroupPrimitive.ToggleGroup>
      </ToggleGroupContext.Provider>
    );
  }
);

BaseToggleGroup.displayName = "BaseToggleGroup";

export const ToggleGroup = styled(BaseToggleGroup, {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  padding: 1,
  background: theme.colors.backgroundControls,
  border: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[4],
});

const IconButtonStyled = styled(IconButton, {
  "&[data-focused=true], &:focus-visible": {
    // To not overlap focus-ring by the next button
    zIndex: 0,
  },
});

const BaseToggleGroupButton = forwardRef<
  ElementRef<"button">,
  ComponentProps<typeof IconButton>
>((props, ref) => {
  const { color } = useContext(ToggleGroupContext);
  return (
    <IconButtonStyled
      ref={ref}
      {...props}
      variant={
        // default is unselected state
        // when button is selected fallback to preset
        props["aria-checked"] === true
          ? color === "default"
            ? "preset"
            : color
          : "default"
      }
      css={{
        width: "auto",
        height: theme.spacing[11],
        minWidth: theme.spacing[11],
        borderRadius: theme.borderRadius[2],
        ...textVariants.labelsTitleCase,
      }}
    />
  );
});

BaseToggleGroupButton.displayName = "BaseToggleGroupButton";

type ToggleGroupButtonProps = ComponentProps<typeof ToggleGroupPrimitive.Item>;

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
