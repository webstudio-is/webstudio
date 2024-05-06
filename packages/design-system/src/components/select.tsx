import * as Primitive from "@radix-ui/react-select";
import {
  type ReactNode,
  type Ref,
  type ComponentProps,
  useMemo,
  forwardRef,
  useState,
} from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@webstudio-is/icons";
import { rawTheme, styled, theme } from "../stitches.config";
import {
  menuCss,
  menuItemCss,
  menuItemIndicatorCss,
  labelCss,
  separatorCss,
  MenuCheckedIcon,
} from "./menu";
import { SelectButton } from "./select-button";

export const SelectContent = styled(Primitive.Content, menuCss, {
  "&[data-side=top]": {
    "--ws-select-description-display-top": "block",
    "--ws-select-description-order": 0,
  },
  "&[data-side=bottom]": {
    "--ws-select-description-display-bottom": "block",
    "--ws-select-description-order": 2,
  },
});

export const SelectViewport = Primitive.Viewport;

export const SelectLabel = styled(Primitive.Label, labelCss);

export const SelectSeparator = styled(Primitive.Separator, separatorCss);

export const SelectGroup = Primitive.Group;

const StyledItem = styled(Primitive.Item, menuItemCss);

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
export const SelectItem = forwardRef(SelectItemBase);

export type SelectOption = string;

const Description = styled("div", menuItemCss);

// Note this only works in combination with position: popper on Content component, because only popper exposes data-side attribute
export const SelectItemDescription = ({
  children,
  style,
  ...props
}: ComponentProps<typeof Description>) => {
  return (
    <>
      <SelectSeparator
        style={{
          display: `var(--ws-select-description-display-bottom, none)`,
          order: "var(--ws-select-description-order)",
        }}
      />
      <Description
        {...props}
        hint
        style={{
          ...style,
          order: "var(--ws-select-description-order)",
        }}
      >
        {children}
      </Description>
      <SelectSeparator
        style={{
          display: `var(--ws-select-description-display-top, none)`,
          order: "var(--ws-select-description-order)",
        }}
      />
    </>
  );
};

type TriggerPassThroughProps = Omit<
  ComponentProps<typeof Primitive.Trigger>,
  "onChange" | "value" | "defaultValue" | "asChild" | "prefix"
> &
  Omit<ComponentProps<typeof SelectButton>, "onChange" | "value">;

export type SelectProps<Option = SelectOption> = {
  options: readonly Option[];
  defaultValue?: Option;
  value?: Option;
  onChange?: (option: Option) => void;
  onItemHighlight?: (value?: Option) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  children?: ReactNode;
  getDescription?: (option: Option) => ReactNode | undefined;
  getItemProps?: (
    option: Option
  ) => Omit<ComponentProps<typeof SelectItem>, "children" | "value">;
} & (Option extends string
  ? {
      getLabel?: (option: Option) => ReactNode | undefined;
      getValue?: (option: Option) => string | undefined;
    }
  : {
      getLabel: (option: Option) => ReactNode | undefined;
      getValue: (option: Option) => string | undefined;
    }) &
  TriggerPassThroughProps;

const defaultGetValue = (option: unknown) => {
  if (typeof option === "string") {
    return option;
  }
  throw new Error(
    `Cannot automatically convert ${typeof option} to string. Provide a getValue/getLabel/getDescription`
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
    onItemHighlight,
    open,
    getLabel = defaultGetValue,
    getValue = defaultGetValue,
    getDescription,
    getItemProps,
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

  const [highlightedItem, setHighlightedItem] = useState<Option>();

  const itemForDescription = highlightedItem ?? value ?? defaultValue;
  const description = itemForDescription
    ? getDescription?.(itemForDescription)
    : undefined;

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
        <SelectContent position="popper">
          <SelectScrollUpButton css={{ order: 1 }}>
            <ChevronUpIcon />
          </SelectScrollUpButton>

          <SelectViewport style={{ order: 1, maxHeight: rawTheme.spacing[34] }}>
            {children ||
              options.map((option, index) => {
                const value = getValue(option) ?? "";
                const { textValue, ...rest } = getItemProps?.(option) ?? {};
                return (
                  <SelectItem
                    key={value ?? index}
                    value={value}
                    textValue={textValue ?? value}
                    onFocus={() => {
                      onItemHighlight?.(option);
                      setHighlightedItem(option);
                    }}
                    onBlur={(event) => {
                      onItemHighlight?.(undefined);
                      setHighlightedItem(undefined);
                    }}
                    text="sentence"
                    {...rest}
                  >
                    {getLabel(option)}
                  </SelectItem>
                );
              })}
          </SelectViewport>

          <SelectScrollDownButton css={{ order: 2 }}>
            <ChevronDownIcon />
          </SelectScrollDownButton>

          {description && (
            <SelectItemDescription>{description}</SelectItemDescription>
          )}
        </SelectContent>
      </Primitive.Portal>
    </Primitive.Root>
  );
};

export const Select = forwardRef(SelectBase) as <Option>(
  props: SelectProps<Option> & { ref?: Ref<HTMLButtonElement> }
) => JSX.Element | null;
