import type {
  KeywordValue,
  StyleValue,
  TupleValue,
  UnitValue,
} from "@webstudio-is/css-engine";

export const isTimingFunction = (timing: string) => {
  const regex =
    /^(ease(-in-out|-in|-out)?|linear|cubic-bezier\((-?\d+(\.\d+)?, ?){3}-?\d+(\.\d+)?\)|steps\(\d+(-?(start|end))?\))$/gm;
  return regex.test(timing);
};

export type ExtractedTransitionProperties = {
  property?: KeywordValue | null;
  timing?: KeywordValue | null;
  delay?: StyleValue | null;
  duration?: StyleValue | null;
};

export const extractTransitionProperties = (
  transition: TupleValue
): ExtractedTransitionProperties => {
  let property: KeywordValue | null = null;
  let timing: KeywordValue | null = null;
  let duration: UnitValue | null = null;
  let delay: UnitValue | null = null;

  const keywordValues: KeywordValue[] = [];
  const unitValues: UnitValue[] = [];

  for (const property of transition.value) {
    if (property.type === "keyword") {
      keywordValues.push(property);
    }

    if (property.type === "unit") {
      unitValues.push(property);
    }
  }

  if (keywordValues.length && isTimingFunction(keywordValues[0].value)) {
    timing = keywordValues[0];
  } else {
    property = keywordValues[0];
    timing = keywordValues[1] ?? null;
  }

  duration = unitValues[0] ?? null;
  delay = unitValues[1] ?? null;

  return {
    property,
    duration,
    timing,
    delay,
  };
};
