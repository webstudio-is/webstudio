import {
  toValue,
  type CssProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { $selectedInstanceSizes } from "~/shared/nano-states";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

export const getComputedValuePreview = (
  property: CssProperty,
  value: StyleValue | undefined,
  declaration: ComputedStyleDecl | undefined
) => {
  if (
    value === undefined ||
    declaration === undefined ||
    toValue(declaration.cascadedValue) !== toValue(value) ||
    declaration.usedValue.type === "invalid" ||
    declaration.usedValue.type === "guaranteedInvalid"
  ) {
    return;
  }
  return (
    $selectedInstanceSizes.get().computedValues[property] ||
    toValue(declaration.usedValue)
  );
};
