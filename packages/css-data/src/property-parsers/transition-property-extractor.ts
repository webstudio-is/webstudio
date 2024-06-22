import type {
  KeywordValue,
  TupleValue,
  UnitValue,
} from "@webstudio-is/css-engine";

export const isTimingFunction = (timing: string) => {
  const regex =
    /^(ease(-in-out|-in|-out)?|linear|cubic-bezier\((-?\d+(\.\d+)?, ?){3}-?\d+(\.\d+)?\)|steps\(\d+(-?(start|end))?\))$/gm;
  return regex.test(timing);
};

export type ExtractedTransitionProperties = {
  property?: KeywordValue;
  timing?: KeywordValue;
  delay?: UnitValue;
  duration?: UnitValue;
};

export const extractTransitionProperties = (
  transition: TupleValue
): ExtractedTransitionProperties => {
  let property: KeywordValue | undefined;
  let timing: KeywordValue | undefined;

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
    timing = keywordValues[1] ?? undefined;
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
