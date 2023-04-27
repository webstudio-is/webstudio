import * as Primitive from "@radix-ui/react-select";
import React, {
  type ReactNode,
  type Ref,
  type ComponentProps,
  useMemo,
} from "react";
import {
  menuCss,
  menuItemCss,
  menuItemIndicatorCss,
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

const StyledItem = styled(Primitive.Item, menuItemCss, {
  // we don't want to transform text using CSS in case of the Select,
  // we want getLabel to handle it
  textTransform: "none",
});

const StyledIndicator = styled(Primitive.ItemIndicator, menuItemIndicatorCss);

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
  Omit<ComponentProps<typeof SelectButton>, "onChange" | "value">;

export type SelectProps<Option = SelectOption> = {
  options: Option[];
  defaultValue?: Option;
  value?: Option;
  onChange?: (option: Option) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  children?: ReactNode;
} & (Option extends string
  ? {
      getLabel?: (option: Option) => string | undefined;
      getValue?: (option: Option) => string | undefined;
    }
  : {
      getLabel: (option: Option) => string | undefined;
      getValue: (option: Option) => string | undefined;
    }) &
  TriggerPassThroughProps;

const defaultGetValue = (option: unknown) => {
  if (typeof option === "string") {
    return option;
  }
  throw new Error(
    `Cannot automatically convert ${typeof option} to string. Provide a getValue/getLabel`
  );
};

const SelectBase = <Option,>(
  {
    options,
    value,
    defaultValue,
    placeholder = "Select an option",
    onChange,
    onOpenChange,
    open,
    getLabel = defaultGetValue,
    getValue = defaultGetValue,
    name,
    children,
    prefix,
    ...props
  }: SelectProps<Option>,
  forwardedRef: Ref<HTMLButtonElement>
) => {
  const valueToOption = useMemo(() => {
    const map = new Map<string, Option>();
    for (const option of options) {
      map.set(getValue(option) ?? "", option);
    }
    return map;
  }, [options, getValue]);

  return (
    <Primitive.Root
      name={name}
      value={value === undefined ? undefined : getValue(value)}
      defaultValue={
        defaultValue === undefined ? undefined : getValue(defaultValue)
      }
      onValueChange={(value) => {
        const option = valueToOption.get(value);
        if (option !== undefined) {
          onChange?.(option);
        }
      }}
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

export const Select = React.forwardRef(SelectBase) as <Option>(
  props: SelectProps<Option> & { ref?: Ref<HTMLButtonElement> }
) => JSX.Element | null;
