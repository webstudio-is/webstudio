import React from "react";
import { CheckIcon } from "@webstudio-is/icons";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { styled, CSS } from "../stitches.config";
import { Box } from "./box";
import { Tooltip } from "./tooltip";

const StyledContent = styled(DropdownMenuPrimitive.Content, {
  maxWidth: "224px",
  backgroundColor: "$colors$slate4",
  borderRadius: "4px",
  padding: "8px",
  boxShadow:
    "0px 2px 7px rgba(0, 0, 0, 0.1), 0px 5px 17px rgba(0, 0, 0, 0.15), inset 0 0 1px 1px $colors$gray1, 0 0 0 1px $colors$gray8",
});

const itemStyles = {
  all: "unset",
  fontSize: "$2",
  lineHeight: 1,
  color: "$colors$slate12",
  borderRadius: 3,
  display: "flex",
  alignItems: "center",
  height: 28,
  padding: "0 5px",
  position: "relative",
  paddingLeft: 25,
  paddingRight: 25,
  userSelect: "none",
  gap: "8px",
  "&:hover": {
    background: "$colors$blue10",
    color: "$colors$blue1",
    "& *": { fill: "$colors$blue1" },
  },
};

const StyledRadioItem = styled(DropdownMenuPrimitive.RadioItem, {
  ...itemStyles,
});
const StyledItemIndicator = styled(DropdownMenuPrimitive.ItemIndicator, {
  position: "absolute",
  left: 0,
  width: 25,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const StyledArrow = styled(DropdownMenuPrimitive.Arrow, {
  "& *": {
    fill: "$colors$gray4",
    stroke: "$colors$gray8",
  },
});

const IconButton = styled("button", {
  all: "unset",
  fontFamily: "inherit",
  borderRadius: "2px",
  width: "100%",
  height: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "$colors$gray12",
  backgroundColor: "$colors$loContrast",
  "&:hover": {
    backgroundColor: "$colors$gray3",
  },
  "& svg": {
    width: "24px",
    height: "24px",
  },
  "& path": {
    fill: "currentColor",
  },
  "&[data-state=open]": {
    backgroundColor: "$colors$blue10",
    "& path": {
      fill: "$colors$blue1",
    },
  },
});

export const Comboicon = ({
  label,
  value,
  items,
  onChange,
  icons,
  css,
}: {
  label: string;
  value: string;
  items: Array<{ label: string; name: string }>;
  onChange: (value: string) => void;
  icons: Record<string, (props: unknown) => JSX.Element>;
  css: CSS;
}) => {
  const TriggerIcon = icons?.[value];
  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <Tooltip
        content={label}
        delayDuration={700 * 2}
        disableHoverableContent={true}
      >
        <DropdownMenuPrimitive.Trigger asChild>
          <IconButton css={css}>{TriggerIcon && <TriggerIcon />}</IconButton>
        </DropdownMenuPrimitive.Trigger>
      </Tooltip>

      <StyledContent sideOffset={4}>
        <DropdownMenuPrimitive.RadioGroup
          value={value}
          onValueChange={onChange}
        >
          {items.map(({ name, label }: { name: string; label: string }) => {
            const ItemIcon = icons[name];
            if (!ItemIcon) return null;
            return (
              <StyledRadioItem key={name} value={label}>
                <StyledItemIndicator>
                  <CheckIcon />
                </StyledItemIndicator>
                <Box css={{ transform: css.transform }}>
                  <ItemIcon />
                </Box>
                {label}
              </StyledRadioItem>
            );
          })}
        </DropdownMenuPrimitive.RadioGroup>
        <StyledArrow offset={12} />
      </StyledContent>
    </DropdownMenuPrimitive.Root>
  );
};
