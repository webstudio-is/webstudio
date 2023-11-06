import { useEffect, useMemo, useState } from "react";
import type { KeywordValue, TupleValueItem } from "@webstudio-is/css-engine";
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
import {
  defaultFunctions,
  easeInFunctions,
  easeOutFunctions,
  easeInOutFunctions,
  timingFunctions,
  findTimingFunctionFromValue,
  type TimingFunctions,
  type EaseInFunction,
  type EaseOutFunction,
  type DefaultFunction,
  type EaseInOutFunction,
} from "./transition-utils";

type NameAndLabel = { name: TimingFunctions; value: string };

type TransitionTimingProps = {
  timing: KeywordValue;
  onTimingSelection: (timing: TupleValueItem) => void;
};

const comboBoxStyles = css({ zIndex: theme.zIndices[1] });

export const TransitionTiming = ({
  timing,
  onTimingSelection,
}: TransitionTimingProps) => {
  const [inputValue, setInputValue] = useState(
    findTimingFunctionFromValue(timing.value) ?? timing.value ?? ""
  );
  useEffect(
    () =>
      setInputValue(
        findTimingFunctionFromValue(timing.value) ?? timing.value ?? ""
      ),
    [timing.value]
  );

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
      value: timingFunctions[prop],
    })),
    value: {
      name: inputValue as TimingFunctions,
      value: timingFunctions[inputValue as TimingFunctions] ?? "",
    },
    selectedItem: undefined,
    itemToString: (value) => value?.name ?? "",
    onInputChange: (value) => setInputValue(value ?? ""),
    onItemSelect: (prop) => {
      setInputValue(prop.name);
      onTimingSelection({ type: "keyword", value: prop.value });
    },
  });

  const defaults = useMemo(() => {
    return items.filter(
      (
        prop: NameAndLabel
      ): prop is { name: DefaultFunction; value: string } => {
        return Object.keys(defaultFunctions).includes(prop.name);
      }
    );
  }, [items]);

  const easeIns = useMemo(() => {
    return items.filter(
      (prop: NameAndLabel): prop is { name: EaseInFunction; value: string } => {
        return Object.keys(easeInFunctions).includes(prop.name);
      }
    );
  }, [items]);

  const easeOuts = useMemo(() => {
    return items.filter(
      (
        prop: NameAndLabel
      ): prop is { name: EaseOutFunction; value: string } => {
        return Object.keys(easeOutFunctions).includes(prop.name);
      }
    );
  }, [items]);

  const easeInOuts = useMemo(() => {
    return items.filter(
      (
        prop: NameAndLabel
      ): prop is { name: EaseInOutFunction; value: string } => {
        return Object.keys(easeInOutFunctions).includes(prop.name);
      }
    );
  }, [items]);

  const renderItem = (item: NameAndLabel, index: number) => {
    return (
      <ComboboxListboxItem
        key={item.name}
        selectable={false}
        {...getItemProps({ item, index })}
        css={{ paddingLeft: theme.spacing[11] }}
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
