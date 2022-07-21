import React from "react";
import { styled } from "@stitches/react";
import { CheckIcon } from "@radix-ui/react-icons";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

const StyledContent = styled(DropdownMenuPrimitive.Content, {
  maxWidth: "224px",
  backgroundColor: "$colors$gray4",
  borderRadius: "4px",
  padding: "8px",
  boxShadow:
    "0px 2px 7px rgba(0, 0, 0, 0.1), 0px 5px 17px rgba(0, 0, 0, 0.15), inset 0 0 0 1px $colors$gray1, 0 0 0 1px $colors$gray8",
});

const itemStyles = {
  all: "unset",
  fontSize: 13,
  lineHeight: 1,
  color: "$colors$gray12",
  borderRadius: 3,
  display: "flex",
  alignItems: "center",
  height: 25,
  padding: "0 5px",
  position: "relative",
  paddingLeft: 25,
  userSelect: "none",
  gap: "8px",
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
  fill: "$colors$gray4",
  // @todo convert to clip-path of it's parent so that the shadow applies
  "& *": {
    fill: "transparent",
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

export const Comboicon = ({ value, items, onChange, icons, css }: any) => {
  const TriggerIcon = icons?.[value];
  return (
    <DropdownMenuPrimitive.Root modal={false}>
      <DropdownMenuPrimitive.Trigger asChild>
        <IconButton css={css}>{TriggerIcon && <TriggerIcon />}</IconButton>
      </DropdownMenuPrimitive.Trigger>

      <StyledContent>
        <DropdownMenuPrimitive.RadioGroup
          value={value}
          onValueChange={onChange}
        >
          {items
            .map(({ name, label }: any) => ({
              icon: icons?.[name],
              name,
              label,
            }))
            .filter(({ icon }: any) => Boolean(icon))
            .map(({ name, label, icon: ItemIcon }: any) => {
              return (
                <StyledRadioItem key={name} value={label}>
                  <StyledItemIndicator>
                    <CheckIcon />
                  </StyledItemIndicator>
                  <ItemIcon />
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
