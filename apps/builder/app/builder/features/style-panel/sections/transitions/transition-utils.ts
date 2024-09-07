import {
  FunctionValue,
  UnparsedValue,
  type KeywordValue,
  type LayersValue,
  type UnitValue,
} from "@webstudio-is/css-engine";
import {
  extractTransitionProperties,
  properties,
  transitionLongHandProperties,
} from "@webstudio-is/css-data";
import {
  createBatchUpdate,
  type StyleUpdateOptions,
} from "../../shared/use-style-data";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

export type TransitionProperty = (typeof transitionLongHandProperties)[number];

export const defaultFunctions = {
  linear: "linear",
  ease: "ease",
  "ease in": "ease-in",
  "ease out": "ease-out",
  "ease-in-out": "ease-in-out",
} as const;

export const easeInFunctions = {
  "ease-in-sine": "cubic-bezier(0.12,0,0.39,0)",
  "ease-in-quad": "cubic-bezier(0.11,0,0.5,0)",
  "ease-in-cubic": "cubic-bezier(0.32,0,0.67,0)",
  "ease-in-quart": "cubic-bezier(0.5,0,0.75,0)",
  "ease-in-quint": "cubic-bezier(0.64,0,0.78,0)",
  "ease-in-expo": "cubic-bezier(0.7,0,0.84,0)",
  "ease-in-circ": "cubic-bezier(0.55,0,1,0.45)",
  "ease-in-back": "cubic-bezier(0.36,0,0.66,-0.56)",
} as const;

export const easeOutFunctions = {
  "ease-out-sine": "cubic-bezier(0.61,1,0.88,1)",
  "ease-out-quad": "cubic-bezier(0.5,1,0.89,1)",
  "ease-out-cubic": "cubic-bezier(0.33,1,0.68,1)",
  "ease-out-quart": "cubic-bezier(0.25,1,0.5,1)",
  "ease-out-quint": "cubic-bezier(0.22,1,0.36,1)",
  "ease-out-expo": "cubic-bezier(0.16,1,0.3,1)",
  "ease-out-circ": "cubic-bezier(0,0.55,0.45,1)",
  "ease-out-back": "cubic-bezier(0.34,1.56,0.64,1)",
} as const;

export const easeInOutFunctions = {
  "ease-in-out-sine": "cubic-bezier(0.37,0,0.63,1)",
  "ease-in-out-quad": "cubic-bezier(0.45,0,0.55,1)",
  "ease-in-out-cubic": "cubic-bezier(0.65,0,0.35,1)",
  "ease-in-out-quart": "cubic-bezier(0.76,0,0.24,1)",
  "ease-in-out-quint": "cubic-bezier(0.83,0,0.17,1)",
  "ease-in-out-expo": "cubic-bezier(0.87,0,0.13,1)",
  "ease-in-out-circ": "cubic-bezier(0.85,0,0.15,1)",
  "ease-in-out-back": "cubic-bezier(0.68,-0.6,0.32,1.6)",
} as const;

export const timingFunctions = {
  ...defaultFunctions,
  ...easeInFunctions,
  ...easeOutFunctions,
  ...easeInOutFunctions,
} as const;

export type DefaultFunction = keyof typeof defaultFunctions;
export type EaseInFunction = keyof typeof easeInFunctions;
export type EaseOutFunction = keyof typeof easeOutFunctions;
export type EaseInOutFunction = keyof typeof easeInOutFunctions;
export type TimingFunctions =
  | DefaultFunction
  | EaseInFunction
  | EaseOutFunction
  | EaseInOutFunction;

export const findTimingFunctionFromValue = (
  timingFunction: string
): TimingFunctions | undefined => {
  const cleanedFuncValue = timingFunction.replace(/\s/g, "");

  return (Object.keys(timingFunctions) as TimingFunctions[]).find(
    (key: TimingFunctions) => timingFunctions[key] === cleanedFuncValue
  );
};

const getTransitionProperties = (
  styles: ComputedStyleDecl[]
): Record<TransitionProperty, LayersValue> => {
  const properties: Record<TransitionProperty, LayersValue> = {
    transitionProperty: { type: "layers", value: [] },
    transitionTimingFunction: { type: "layers", value: [] },
    transitionDelay: { type: "layers", value: [] },
    transitionDuration: { type: "layers", value: [] },
    transitionBehavior: { type: "layers", value: [] },
  };
  for (const styleDecl of styles) {
    if (styleDecl.cascadedValue.type === "layers") {
      properties[styleDecl.property as TransitionProperty] =
        styleDecl.cascadedValue;
    }
  }

  return properties;
};

// @todo support editing transition-behavior
export const editTransitionLayer = (props: {
  index: number;
  layers: LayersValue;
  options: StyleUpdateOptions;
  styles: ComputedStyleDecl[];
}) => {
  const { index, layers, options } = props;
  const batch = createBatchUpdate();

  const newTransitionProperties: Array<KeywordValue | UnparsedValue> = [];
  const newTransitionDurations: UnitValue[] = [];
  const newTransitionDelays: UnitValue[] = [];
  const newTransitionTimingFunctions: Array<KeywordValue | FunctionValue> = [];

  for (const layer of layers.value) {
    if (layer.type !== "tuple") {
      continue;
    }

    const {
      property,
      duration = properties.transitionDuration.initial,
      timing = properties.transitionTimingFunction.initial,
      delay = properties.transitionDelay.initial,
    } = extractTransitionProperties(layer);

    // transition-property can't be undefined
    if (property === undefined) {
      return;
    }

    newTransitionProperties.push(property);
    newTransitionDurations.push(duration);
    newTransitionDelays.push(delay);
    newTransitionTimingFunctions.push(timing);
  }

  const existingTransitionProperties = getTransitionProperties(props.styles);
  const {
    transitionProperty,
    transitionDelay,
    transitionDuration,
    transitionTimingFunction,
  } = existingTransitionProperties;

  const newProperty = [...transitionProperty.value];
  newProperty.splice(index, 1, ...newTransitionProperties);
  batch.setProperty("transitionProperty")({
    type: "layers",
    value: newProperty,
  });

  const newDuration = [...transitionDuration.value];
  newDuration.splice(index, 1, ...newTransitionDurations);
  batch.setProperty("transitionDuration")({
    type: "layers",
    value: newDuration,
  });

  const newTiming = [...transitionTimingFunction.value];
  newTiming.splice(index, 1, ...newTransitionTimingFunctions);
  batch.setProperty("transitionTimingFunction")({
    type: "layers",
    value: newTiming,
  });

  const newDelay = [...transitionDelay.value];
  newDelay.splice(index, 1, ...newTransitionDelays);
  batch.setProperty("transitionDelay")({
    type: "layers",
    value: newDelay,
  });

  batch.publish(options);
};
