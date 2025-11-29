import {
  type ColorValue,
  type KeywordValue,
  type RgbValue,
  type UnitValue,
  type VarValue,
} from "@webstudio-is/css-engine";

export type GradientColorValue =
  | ColorValue
  | RgbValue
  | KeywordValue
  | VarValue;

export type GradientStop = {
  color?: GradientColorValue;
  position?: UnitValue | VarValue;
  hint?: UnitValue | VarValue;
};

export type ParsedGradientBase = {
  stops: GradientStop[];
  repeating?: boolean;
};

export type ParsedLinearGradient = ParsedGradientBase & {
  type: "linear";
  angle?: UnitValue | VarValue;
  sideOrCorner?: KeywordValue;
};

export type ParsedConicGradient = ParsedGradientBase & {
  type: "conic";
  angle?: UnitValue | VarValue;
  position?: string;
};

export type ParsedRadialGradient = ParsedGradientBase & {
  type: "radial";
  shape?: KeywordValue;
  size?: string;
  position?: string;
};

export type ParsedGradient =
  | ParsedLinearGradient
  | ParsedConicGradient
  | ParsedRadialGradient;
