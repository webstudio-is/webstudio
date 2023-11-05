import { useEffect, useMemo, useState } from "react";
import type { KeywordValue } from "@webstudio-is/css-engine";
import {
  Combobox,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxListbox,
  InputField,
  Label,
  NestedInputButton,
  useCombobox,
  css,
  ComboboxLabel,
  theme,
  ComboboxListboxItem,
  ComboboxSeparator,
} from "@webstudio-is/design-system";

const defaultFunctions = {
  linear: "linear",
  ease: "ease",
  "ease in": "ease-in",
  "ease out": "ease-out",
  "ease-in-out": "ease-in-out",
} as const;

const easeInFunctions = {
  "ease-in-sine": "cubic-bezier(0.12, 0, 0.39, 0)",
  "ease-in-quad": "cubic-bezier(0.11, 0, 0.5, 0)",
  "ease-in-cubic": "cubic-bezier(0.32, 0, 0.67, 0)",
  "ease-in-quart": "cubic-bezier(0.5, 0, 0.75, 0)",
  "ease-in-quint": "cubic-bezier(0.64, 0, 0.78, 0)",
  "ease-in-expo": "cubic-bezier(0.7, 0, 0.84, 0)",
  "ease-in-circ": "cubic-bezier(0.55, 0, 1, 0.45)",
  "ease-in-back": "cubic-bezier(0.36, 0, 0.66, -0.56)",
} as const;

const easeOutFunctions = {
  "ease-out-sine": "cubic-bezier(0.61, 1, 0.88, 1)",
  "ease-out-quad": "cubic-bezier(0.5, 1, 0.89, 1)",
  "ease-out-cubic": "cubic-bezier(0.33, 1, 0.68, 1)",
  "ease-out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
  "ease-out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
  "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
  "ease-out-circ": "cubic-bezier(0, 0.55, 0.45, 1)",
  "ease-out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

const easeInOutFunctions = {
  "ease-in-out-sine": "cubic-bezier(0.37, 0, 0.63, 1)",
  "ease-in-out-quad": "cubic-bezier(0.45, 0, 0.55, 1)",
  "ease-in-out-cubic": "cubic-bezier(0.65, 0, 0.35, 1)",
  "ease-in-out-quart": "cubic-bezier(0.76, 0, 0.24, 1)",
  "ease-in-out-quint": "cubic-bezier(0.83, 0, 0.17, 1)",
  "ease-in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
  "ease-in-out-circ": "cubic-bezier(0.85, 0, 0.15, 1)",
  "ease-in-out-back": "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
} as const;

type DefaultFunction = keyof typeof defaultFunctions;
type EaseInFunction = keyof typeof easeInFunctions;
type EaseOutFunction = keyof typeof easeOutFunctions;
type EaseInOutFunction = keyof typeof easeInOutFunctions;

type TimingFunctions =
  | DefaultFunction
  | EaseInFunction
  | EaseOutFunction
  | EaseInOutFunction;

const timingFunctions = {
  ...defaultFunctions,
  ...easeInFunctions,
  ...easeOutFunctions,
  ...easeInOutFunctions,
} as const;

type NameAndLabel = { name: TimingFunctions; label?: string };

type TransitionTimingProps = {
  timing: KeywordValue;
};

const comboBoxStyles = css({ zIndex: theme.zIndices[1] });

export const TransitionTiming = ({ timing }: TransitionTimingProps) => {
  const [inputValue, setInputValue] = useState(timing.value ?? "ease");
  useEffect(() => setInputValue(timing.value), [timing.value]);

  const {
    items,
    isOpen,
    getComboboxProps,
    getToggleButtonProps,
    getInputProps,
    getMenuProps,
    getItemProps,
  } = useCombobox<NameAndLabel>({
    items: (Object.keys(timingFunctions) as TimingFunctions[]).map((prop) => ({
      name: prop,
      label: prop,
    })),
    value: { name: inputValue as TimingFunctions, label: inputValue },
    selectedItem: undefined,
    itemToString: (value) => value?.name ?? "",
    onInputChange: (value) => setInputValue(value ?? ""),
    onItemSelect: (prop) => {
      setInputValue(prop.name);
      console.log(timingFunctions[prop.name]);
    },
  });

  const defaults = useMemo(() => {
    return items.filter(
      (prop: NameAndLabel): prop is { name: DefaultFunction } => {
        return Object.keys(defaultFunctions).includes(prop.name);
      }
    );
  }, [items]);

  const easeIns = useMemo(() => {
    return items.filter(
      (prop: NameAndLabel): prop is { name: EaseInFunction } => {
        return Object.keys(easeInFunctions).includes(prop.name);
      }
    );
  }, [items]);

  const easeOuts = useMemo(() => {
    return items.filter(
      (prop: NameAndLabel): prop is { name: EaseOutFunction } => {
        return Object.keys(easeOutFunctions).includes(prop.name);
      }
    );
  }, [items]);

  const easeInOuts = useMemo(() => {
    return items.filter(
      (prop: NameAndLabel): prop is { name: EaseInOutFunction } => {
        return Object.keys(easeOutFunctions).includes(prop.name);
      }
    );
  }, [items]);

  const renderItem = (item: NameAndLabel, index: number) => {
    return (
      <ComboboxListboxItem
        key={item.name}
        selectable={false}
        {...getItemProps({ item, index })}
      >
        {item.name}
      </ComboboxListboxItem>
    );
  };

  return (
    <>
      <Label>Timing</Label>
      <Combobox>
        <div {...getComboboxProps()}>
          <ComboboxAnchor>
            <InputField
              autoFocus
              {...getInputProps({ onKeyDown: (e) => e.stopPropagation() })}
              placeholder="ease"
              suffix={<NestedInputButton {...getToggleButtonProps()} />}
            />
          </ComboboxAnchor>
          <ComboboxContent
            align="end"
            sideOffset={5}
            className={comboBoxStyles()}
          >
            <ComboboxListbox {...getMenuProps()}>
              {isOpen && (
                <>
                  <ComboboxLabel>Default</ComboboxLabel>
                  {defaults.map(renderItem)}
                  <ComboboxSeparator />

                  <ComboboxLabel>Ease In</ComboboxLabel>
                  {easeIns.map((prop, index) =>
                    renderItem(prop, defaults.length + index)
                  )}
                  <ComboboxSeparator />

                  <ComboboxLabel>Ease Out</ComboboxLabel>
                  {easeOuts.map((prop, index) =>
                    renderItem(prop, defaults.length + easeIns.length + index)
                  )}
                  <ComboboxSeparator />

                  <ComboboxLabel>Ease In Out</ComboboxLabel>
                  {easeInOuts.map((prop, index) =>
                    renderItem(
                      prop,
                      defaults.length + easeIns.length + easeOuts.length + index
                    )
                  )}
                </>
              )}
            </ComboboxListbox>
          </ComboboxContent>
        </div>
      </Combobox>
    </>
  );
};
