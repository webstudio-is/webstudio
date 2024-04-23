import { useState, useEffect } from "react";
import type { KeywordValue } from "@webstudio-is/css-engine";
import {
  Label,
  Tooltip,
  Flex,
  Text,
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

type TransitionTimingProps = {
  timing: KeywordValue;
  onTimingSelection: (params: { timing: KeywordValue }) => void;
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
    findTimingFunctionFromValue(timing.value) ?? "custom"
  );

  useEffect(
    () => setValue(findTimingFunctionFromValue(timing.value) ?? "custom"),
    [timing.value]
  );

  return (
    <>
      <Flex align="center">
        <Tooltip
          content={
            <Flex gap="2" direction="column">
              <Text variant="regularBold">Easing</Text>
              <Text variant="monoBold" color="moreSubtle">
                transition-timing-function
              </Text>
              <Text>
                Affects the look and feel of the
                <br />
                animation by varying the speed
                <br />
                of the transition at different
                <br />
                points in its duration.
              </Text>
            </Flex>
          }
        >
          <Label css={{ display: "inline" }}>Easing</Label>
        </Tooltip>
      </Flex>
      <Select
        options={options}
        value={value}
        onChange={(value) => {
          setValue(value);

          if (value === "custom") {
            onTimingSelection({ timing: { type: "keyword", value: "" } });
            return;
          }

          onTimingSelection({
            timing: { type: "keyword", value: timingFunctions[value] },
          });
        }}
      >
        <SelectGroup>
          <SelectLabel>Default</SelectLabel>
          {Object.keys(defaultFunctions).map((defaultFunc) => {
            return (
              <SelectItem key={defaultFunc} value={defaultFunc} text="sentence">
                {defaultFunc}
              </SelectItem>
            );
          })}
          <SelectItem key="custom" value="custom">
            Custom
          </SelectItem>
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
