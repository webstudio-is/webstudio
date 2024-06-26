import {
  FunctionValue,
  toValue,
  type KeywordValue,
  type TupleValue,
  type UnitValue,
} from "@webstudio-is/css-engine";
import { isAnimatableProperty } from "..";

export const isTimingFunction = (timing: string) => {
  const regex =
    /^(ease(-in-out|-in|-out)?|linear|cubic-bezier\((-?\d+(\.\d+)?(, ?)?){3}-?\d+(\.\d+)?\)|steps\(\d+(,(start|end|jump-start|jump-end|jump-none|jump-both))?\))$/gm;
  return regex.test(timing);
};

export type ExtractedTransitionProperties = {
  property?: KeywordValue;
  timing?: KeywordValue | FunctionValue;
  delay?: UnitValue;
  duration?: UnitValue;
};

export const extractTransitionProperties = (
  transition: TupleValue
): ExtractedTransitionProperties => {
  let property: KeywordValue | undefined;
  let timing: KeywordValue | FunctionValue | undefined;

  const unitValues: UnitValue[] = [];

  for (const item of transition.value) {
    if (
      item.type === "keyword" &&
      isAnimatableProperty(toValue(item)) === true
    ) {
      property = item;
    }

    if (item.type === "keyword" && isAnimatableProperty(item.value) === false) {
      timing = item;
    }

    if (item.type === "function") {
      timing = item;
    }

    if (item.type === "unit") {
      unitValues.push(item);
    }
  }

  const duration: UnitValue | undefined = unitValues[0] ?? undefined;
  const delay: UnitValue | undefined = unitValues[1] ?? undefined;

  return {
    property,
    duration,
    timing,
    delay,
  };
};
