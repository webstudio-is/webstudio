import { useState, useEffect, useRef } from "react";
import type {
  CssProperty,
  StyleValue,
  UnitValue,
} from "@webstudio-is/css-engine";
import { toValue } from "@webstudio-is/css-engine";
import { numericScrubControl } from "@webstudio-is/design-system";
import { camelCaseProperty, isValidDeclaration } from "@webstudio-is/css-data";
import { useModifierKeys } from "../../shared/modifier-keys";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { parseIntermediateOrInvalidValue } from "../../shared/css-value-input/parse-intermediate-or-invalid-value";
import type { CssValueInputValue } from "../../shared/css-value-input/css-value-input";

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

export const useScrub = <P extends CssProperty>(props: {
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

  const unitRef = useRef<undefined | UnitValue["unit"]>(undefined);

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
        value = parseIntermediateOrInvalidValue(camelCaseProperty(property), {
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
