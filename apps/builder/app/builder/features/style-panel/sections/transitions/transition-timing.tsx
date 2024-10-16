import { useState, useEffect } from "react";
import {
  StyleValue,
  toValue,
  type FunctionValue,
  type KeywordValue,
} from "@webstudio-is/css-engine";
import { parseCssValue, propertyDescriptions } from "@webstudio-is/css-data";
import {
  Select,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@webstudio-is/design-system";
import {
  defaultFunctions,
  easeInFunctions,
  easeOutFunctions,
  easeInOutFunctions,
  timingFunctions,
  type TimingFunctions,
  findTimingFunctionFromValue,
} from "./transition-utils";
import { PropertyInlineLabel } from "../../property-label";

type TransitionTimingProps = {
  timing: StyleValue;
  onTimingSelection: (params: { timing: KeywordValue | FunctionValue }) => void;
};

const options: TimingFunctions[] = [
  ...Object.keys(timingFunctions),
  "custom",
] as TimingFunctions[] & "custom";

export const TransitionTiming = ({
  timing,
  onTimingSelection,
}: TransitionTimingProps) => {
  const [value, setValue] = useState<TimingFunctions | "custom">(
    findTimingFunctionFromValue(toValue(timing)) ?? "custom"
  );

  useEffect(
    () => setValue(findTimingFunctionFromValue(toValue(timing)) ?? "custom"),
    [timing]
  );

  const handleTimingChange = (value: TimingFunctions | "custom") => {
    setValue(value);

    if (value === "custom") {
      onTimingSelection({ timing: { type: "keyword", value: "" } });
      return;
    }

    const selectedTiming = timingFunctions[value];
    const parsedEasing = parseCssValue(
      "transitionTimingFunction",
      selectedTiming
    );

    if (parsedEasing.type === "invalid") {
      return;
    }
    const easingValue =
      parsedEasing.type === "layers" ? parsedEasing.value[0] : parsedEasing;

    if (easingValue.type === "keyword" || easingValue.type === "function") {
      onTimingSelection({ timing: easingValue });
    }
  };

  return (
    <>
      <PropertyInlineLabel
        label="Easing"
        description={propertyDescriptions.transitionTimingFunction}
        properties={["transitionTimingFunction"]}
      />
      <Select options={options} value={value} onChange={handleTimingChange}>
        <SelectGroup>
          <SelectLabel>Default</SelectLabel>
          {Object.keys(defaultFunctions).map((defaultFunc) => {
            return (
              <SelectItem key={defaultFunc} value={defaultFunc} text="sentence">
                {defaultFunc}
              </SelectItem>
            );
          })}
          {value === "custom" && (
            <SelectItem key="custom" value="custom">
              Custom
            </SelectItem>
          )}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Ease In</SelectLabel>
          {Object.keys(easeInFunctions).map((easeIn) => {
            return (
              <SelectItem key={easeIn} value={easeIn} text="sentence">
                {easeIn}
              </SelectItem>
            );
          })}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Ease Out</SelectLabel>
          {Object.keys(easeOutFunctions).map((easeOut) => {
            return (
              <SelectItem key={easeOut} value={easeOut} text="sentence">
                {easeOut}
              </SelectItem>
            );
          })}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Ease In Out</SelectLabel>
          {Object.keys(easeInOutFunctions).map((easeInOut) => {
            return (
              <SelectItem key={easeInOut} value={easeInOut} text="sentence">
                {easeInOut}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </Select>
    </>
  );
};
