import type { Unit } from "@webstudio-is/css-engine";
import {
  convertibleUnits,
  type ConvertibleUnit,
  type UnitSizes,
} from "~/shared/nano-states";

const isConvertibleUnit = (unit: Unit): unit is ConvertibleUnit =>
  convertibleUnits.includes(unit as ConvertibleUnit);

export const convertUnits =
  (unitSizes: UnitSizes) =>
  (value: number, from: Unit, to: Unit): number => {
    if (from === to) {
      return value;
    }

    if (isConvertibleUnit(from) && isConvertibleUnit(to)) {
      return (value * unitSizes[from]) / unitSizes[to];
    }
    return value;
  };
