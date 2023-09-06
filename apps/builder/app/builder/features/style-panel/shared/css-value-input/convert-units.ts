import type { Unit } from "@webstudio-is/css-engine";

const convertibleUnits = ["px", "ch", "vw", "vh", "em", "rem"] as const;

type ConvertibleUnit = (typeof convertibleUnits)[number];

export type UnitSizes = Record<ConvertibleUnit, number>;

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
