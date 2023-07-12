import type {
  StyleProperty,
  StyleValue,
  UnitValue,
} from "@webstudio-is/css-data";
import { numericScrubControl } from "@webstudio-is/design-system";
import { useState, useEffect, useRef } from "react";
import { useModifierKeys } from "../../shared/modifier-keys";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import type { SpaceStyleProperty } from "../space/types";
import { isValidDeclaration } from "@webstudio-is/css-data";
import { parseIntermediateOrInvalidValue } from "../../shared/css-value-input/parse-intermediate-or-invalid-value";
import { toValue } from "@webstudio-is/css-engine";
import type { CssValueInputValue } from "../../shared/css-value-input/css-value-input";
import type { PositionProperty } from "../position/position-layout";

type ScrubStatus<P extends string> = {
  isActive: boolean;

  // Properties that should be affected on the next pointer move.
  // We keep track of these properties even when scrub is not active.
  properties: ReadonlyArray<P>;

  // When scrub is active, this contains ephemeral values for all properties
  // that have been affected during current scrub.
  //
  // Note that Object.keys(values) != properties above,
  // because user can press and release modifier keys multiple times during scrub.
  values: Partial<Record<P, StyleValue>>;
};

type HoverTarget<P> = {
  property: P;
  element: HTMLElement | SVGElement;
};

export const useScrub = <P extends StyleProperty>(props: {
  value?: StyleValue;
  target: HoverTarget<P> | undefined;
  getModifiersGroup: (
    property: P,
    modifiers: { shiftKey: boolean; altKey: boolean }
  ) => ReadonlyArray<P>;
  onChange: (
    values: Partial<Record<P, StyleValue>>,
    options: StyleUpdateOptions
  ) => void;
}): ScrubStatus<P> => {
  // we want to hold on to the target while scrub is active even if hover changes
  const [activeTarget, setActiveTarget] = useState<HoverTarget<P>>();
  const finalTarget = activeTarget ?? props.target;

  const modifiers = useModifierKeys();

  const properties =
    finalTarget === undefined
      ? []
      : props.getModifiersGroup(finalTarget.property, modifiers);

  const [values, setValues] = useState<Partial<Record<P, StyleValue>>>({});

  // we need these in useEffect, but don't want as dependencies
  const nonDependencies = useRef({ props, values, properties });
  nonDependencies.current = { props, values, properties };

  const unitRef = useRef<UnitValue["unit"]>();

  useEffect(() => {
    if (finalTarget === undefined) {
      return;
    }

    const property = finalTarget.property;

    const handleChange = (event: { value: number }, isEphemeral: boolean) => {
      // for TypeScript
      if (unitRef.current === undefined) {
        return;
      }

      const { values, properties, props } = nonDependencies.current;

      let value: CssValueInputValue = {
        type: "unit",
        value: event.value,
        unit: unitRef.current,
      } as const;

      if (isValidDeclaration(property, toValue(value)) === false) {
        value = parseIntermediateOrInvalidValue(property, {
          type: "intermediate",
          value: `${value.value}`,
          unit: value.unit,
        });

        // In case of negative values for some properties, we might end up with invalid value.
        if (value.type === "invalid") {
          // Try return unitless
          if (isValidDeclaration(property, "0")) {
            value = {
              type: "unit",
              unit: "number",
              value: 0,
            };
          }
        }
      }

      const nextValues = { ...values };
      for (const property of properties) {
        nextValues[property] = value;
      }

      props.onChange(nextValues, { isEphemeral });

      setValues(isEphemeral ? nextValues : {});
    };

    return numericScrubControl(finalTarget.element, {
      direction:
        property.toLowerCase().endsWith("left") ||
        property.toLowerCase().endsWith("right")
          ? "horizontal"
          : "vertical",
      getInitialValue() {
        const { value } = nonDependencies.current.props;
        if (value?.type === "unit") {
          unitRef.current = value.unit;
          return value.value;
        }
        // In case of Auto value
        unitRef.current = "px";
        return 0;
      },
      onValueInput(event) {
        handleChange(event, true);
      },
      onValueChange(event) {
        handleChange(event, false);
      },
      onStatusChange(status) {
        setActiveTarget(
          status === "scrubbing"
            ? nonDependencies.current.props.target
            : undefined
        );
      },
    });
  }, [finalTarget]);

  return {
    isActive: activeTarget !== undefined,
    properties,
    values,
  };
};

const opposingSpaceGroups = [
  ["paddingTop", "paddingBottom"],
  ["paddingRight", "paddingLeft"],
  ["marginTop", "marginBottom"],
  ["marginRight", "marginLeft"],
] as const;

const circleSpaceGroups = [
  ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  ["marginTop", "marginRight", "marginBottom", "marginLeft"],
] as const;

export const getSpaceModifiersGroup = (
  property: SpaceStyleProperty,
  modifiers: { shiftKey: boolean; altKey: boolean }
) => {
  let groups: ReadonlyArray<ReadonlyArray<SpaceStyleProperty>> = [];

  if (modifiers.shiftKey) {
    groups = circleSpaceGroups;
  } else if (modifiers.altKey) {
    groups = opposingSpaceGroups;
  }

  return groups.find((group) => group.includes(property)) ?? [property];
};

const opposingPositionGroups = [
  ["top", "bottom"],
  ["left", "right"],
] as const;

const circlePositionGroups = [["top", "right", "bottom", "left"]] as const;

export const getPositionModifiersGroup = (
  property: PositionProperty,
  modifiers: { shiftKey: boolean; altKey: boolean }
) => {
  let groups: ReadonlyArray<ReadonlyArray<PositionProperty>> = [];

  if (modifiers.shiftKey) {
    groups = circlePositionGroups;
  } else if (modifiers.altKey) {
    groups = opposingPositionGroups;
  }

  return groups.find((group) => group.includes(property)) ?? [property];
};
