import * as Primitive from "@radix-ui/react-select";
import React, { ReactNode, Ref, type ComponentProps } from "react";
import {
  menuCss,
  itemCss,
  itemIndicatorCss,
  labelCss,
  separatorCss,
  MenuCheckedIcon,
} from "./menu";
import { SelectButton } from "./select-button";
import { styled, theme } from "../stitches.config";
import { ChevronDownIcon, ChevronUpIcon } from "@webstudio-is/icons";

export const SelectContent = styled(Primitive.Content, menuCss);

export const SelectViewport = Primitive.Viewport;

export const SelectLabel = styled(Primitive.Label, labelCss);

export const SelectSeparator = styled(Primitive.Separator, separatorCss);

export const SelectGroup = Primitive.Group;

const StyledItem = styled(Primitive.Item, itemCss);

const StyledIndicator = styled(Primitive.ItemIndicator, itemIndicatorCss);

const scrollButtonStyles = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 25,
  color: theme.colors.hiContrast,
  cursor: "default",
};

export const SelectScrollUpButton = styled(
  Primitive.ScrollUpButton,
  scrollButtonStyles
);

export const SelectScrollDownButton = styled(
  Primitive.ScrollDownButton,
  scrollButtonStyles
);

const SelectItemBase = (
  { children, icon = <MenuCheckedIcon />, ...props }: SelectItemProps,
  forwardedRef: Ref<HTMLDivElement>
) => {
  return (
    <StyledItem {...props} withIndicator ref={forwardedRef}>
      <StyledIndicator>{icon}</StyledIndicator>
      <Primitive.ItemText>{children}</Primitive.ItemText>
    </StyledItem>
  );
};

type SelectItemProps = ComponentProps<typeof StyledItem> & {
  children: ReactNode;
  icon?: ReactNode;
};
export const SelectItem = React.forwardRef(SelectItemBase);

export type SelectOption = string;

type TriggerPassThroughProps = Omit<
  ComponentProps<typeof Primitive.Trigger>,
  "onChange" | "value" | "defaultValue" | "asChild" | "prefix"
> &
  Omit<ComponentProps<typeof SelectButton>, "onChange">;

export type SelectProps<Option = SelectOption> = TriggerPassThroughProps & {
  options: Option[];
  defaultValue?: Option;
  value?: Option;
  onChange?: (option: Option) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  getLabel?: (option: Option) => string | undefined;
  getValue?: (option: Option) => string | undefined;
  children?: ReactNode;
};

const SelectBase = (
  {
    options,
    value,
    defaultValue,
    placeholder = "Select an option",
    onChange,
    onOpenChange,
    open,
    getLabel = (option) => option,
    getValue = (option) => option,
    name,
    children,
    prefix,
    ...props
  }: SelectProps,
  forwardedRef: Ref<HTMLButtonElement>
) => {
  return (
    <Primitive.Root
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onChange}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Primitive.Trigger ref={forwardedRef} {...props} asChild>
        <SelectButton prefix={prefix}>
          <Primitive.Value placeholder={placeholder} />
        </SelectButton>
      </Primitive.Trigger>
      <Primitive.Portal>
        <SelectContent>
          <SelectScrollUpButton>
            <ChevronUpIcon />
          </SelectScrollUpButton>
          <SelectViewport>
            {children ||
              options.map((option) => (
                <SelectItem
                  key={getValue(option)}
                  value={getValue(option) ?? ""}
                  textValue={getLabel(option)}
                >
                  {getLabel(option)}
                </SelectItem>
              ))}
          </SelectViewport>
          <SelectScrollDownButton>
            <ChevronDownIcon />
          </SelectScrollDownButton>
        </SelectContent>
      </Primitive.Portal>
    </Primitive.Root>
  );
};

export const Select = React.forwardRef(SelectBase);
Select.displayName = "Select";
