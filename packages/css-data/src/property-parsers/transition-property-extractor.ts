import {
  FunctionValue,
  toValue,
  UnparsedValue,
  type KeywordValue,
  type TupleValue,
  type UnitValue,
} from "@webstudio-is/css-engine";
import { isAnimatableProperty } from "..";

export const isTimingFunction = (name: string) => {
  const allowedNames = [
    "ease-in",
    "ease-out",
    "ease-in-out",
    "linear",
    "cubic-bezier",
    "steps",
  ];

  return allowedNames.includes(name);
};

export type ExtractedTransitionProperties = {
  property?: KeywordValue | UnparsedValue;
  timing?: KeywordValue | FunctionValue;
  delay?: UnitValue;
  duration?: UnitValue;
};

export const extractTransitionProperties = (
  transition: TupleValue
): ExtractedTransitionProperties => {
  let property: KeywordValue | UnparsedValue | undefined;
  let timing: KeywordValue | FunctionValue | undefined;

  const unitValues: UnitValue[] = [];

  for (const item of transition.value) {
    if (
      (item.type === "keyword" || item.type === "unparsed") &&
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
