import React from "react";
import { CheckIcon } from "~/shared/icons";
import { styled, CSS } from "../stitches.config";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { menuCss, separatorCss, itemCss, labelCss } from "./menu";
import { Box } from "./box";
import { Flex } from "./flex";
import { panelStyles } from "./panel";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export const ContextMenuContent = styled(
  ContextMenuPrimitive.Content,
  menuCss,
  panelStyles
);

export const ContextMenuSeparator = styled(
  ContextMenuPrimitive.Separator,
  separatorCss
);

export const ContextMenuItem = styled(ContextMenuPrimitive.Item, itemCss);

const StyledContextMenuRadioItem = styled(
  ContextMenuPrimitive.RadioItem,
  itemCss
);

type ContextMenuRadioItemPrimitiveProps = React.ComponentProps<
  typeof ContextMenuPrimitive.RadioItem
>;
type ContextMenuRadioItemProps = ContextMenuRadioItemPrimitiveProps & {
  css?: CSS;
};

export const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof StyledContextMenuRadioItem>,
  ContextMenuRadioItemProps
>(({ children, ...props }, forwardedRef) => (
  <StyledContextMenuRadioItem {...props} ref={forwardedRef}>
    <Box as="span" css={{ position: "absolute", left: "$1" }}>
      <ContextMenuPrimitive.ItemIndicator>
        <Flex
          css={{
            width: "$3",
            height: "$3",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            css={{
              width: "$1",
              height: "$1",
              backgroundColor: "currentColor",
              borderRadius: "$round",
            }}
          />
        </Flex>
      </ContextMenuPrimitive.ItemIndicator>
    </Box>
    {children}
  </StyledContextMenuRadioItem>
));
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

const StyledContextMenuCheckboxItem = styled(
  ContextMenuPrimitive.CheckboxItem,
  itemCss
);

type ContextMenuCheckboxItemPrimitiveProps = React.ComponentProps<
  typeof ContextMenuPrimitive.CheckboxItem
>;
type ContextMenuCheckboxItemProps = ContextMenuCheckboxItemPrimitiveProps & {
  css?: CSS;
};

export const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof StyledContextMenuCheckboxItem>,
  ContextMenuCheckboxItemProps
>(({ children, ...props }, forwardedRef) => (
  <StyledContextMenuCheckboxItem {...props} ref={forwardedRef}>
    <Box as="span" css={{ position: "absolute", left: "$1" }}>
      <ContextMenuPrimitive.ItemIndicator>
        <CheckIcon />
      </ContextMenuPrimitive.ItemIndicator>
    </Box>
    {children}
  </StyledContextMenuCheckboxItem>
));

ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";

export const ContextMenuLabel = styled(ContextMenuPrimitive.Label, labelCss);
export const ContextMenuRadioGroup = styled(
  ContextMenuPrimitive.RadioGroup,
  {}
);
export const ContextMenuGroup = styled(ContextMenuPrimitive.Group, {});
