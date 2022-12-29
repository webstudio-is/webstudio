import type { StyleValue, UnitValue } from "@webstudio-is/css-data";
import { numericScrubControl } from "@webstudio-is/design-system";
import { useState, useEffect, useRef } from "react";
import { StyleUpdateOptions } from "../../shared/use-style-data";
import type { SpacingStyleProperty, HoverTagret } from "./types";

type Values = Partial<Record<SpacingStyleProperty, StyleValue>>;

type ScrubStatus = {
  isActive: boolean;

  // Properties that should be affected on the next pointer move.
  // We keep track of these properties even when scrub is not active.
  properties: SpacingStyleProperty[];

  // When scrub is active, this contains ephemeral values for all properties
  // that have been affected during current scrub.
  //
  // When scrub is not active, this contains the final values of properties
  // from the last scrub. (@todo: remove this if not used)
  values: Values;
};

export const useScrub = (props: {
  value?: StyleValue;
  target: HoverTagret | undefined;
  onChange: (values: Values, options: StyleUpdateOptions) => void;
}): ScrubStatus => {
  // we want to hold on to the target while scrub is active even if hover changes
  const [activeTarget, setActiveTarget] = useState<HoverTagret>();
  const finalTarget = activeTarget ?? props.target;

  const modifiers = useModifierKeys();

  const properties =
    finalTarget === undefined
      ? []
      : getModifiersGroup(finalTarget.property, modifiers);

  const [values, setValues] = useState<Values>({});

  // we need this in useEffect, but don't want it as a dependency
  // @todo: better name or split
  const ref = useRef({ props, values, properties });
  ref.current = { props, values, properties };

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

      const value = {
        type: "unit",
        value: event.value,
        unit: unitRef.current,
      } as const;

      const nextValues = { ...ref.current.values };
      for (const property of ref.current.properties) {
        nextValues[property] = value;
      }
      setValues(nextValues);

      ref.current.props.onChange(nextValues, { isEphemeral });
    };

    const scrub = numericScrubControl(finalTarget.element, {
      direction:
        property.endsWith("Left") || property.endsWith("Right")
          ? "horizontal"
          : "vertical",
      getValue() {
        const { value } = ref.current.props;
        if (value?.type === "unit") {
          unitRef.current = value.unit;
          return value.value;
        }
      },
      onValueInput(event) {
        handleChange(event, true);
      },
      onValueChange(event) {
        handleChange(event, false);
      },
      onStatusChange(status) {
        setActiveTarget(
          status === "scrubbing" ? ref.current.props.target : undefined
        );
      },
    });

    return scrub.disconnectedCallback;
  }, [finalTarget]);

  return {
    isActive: activeTarget !== undefined,
    properties,
    values,
  };
};

// @todo: move to shared? merge with getModifiersGroup?
const useModifierKeys = () => {
  const [state, setState] = useState({
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) =>
      setState({
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      });

    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);

    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
    };
  }, []);

  return state;
};

const getModifiersGroup = (
  property: SpacingStyleProperty,
  modifiers: { shiftKey: boolean; altKey: boolean }
) => {
  let groups: SpacingStyleProperty[][] = [];

  if (modifiers.shiftKey) {
    groups = [
      ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
      ["marginTop", "marginRight", "marginBottom", "marginLeft"],
    ];
  } else if (modifiers.altKey) {
    groups = [
      ["paddingTop", "paddingBottom"],
      ["paddingRight", "paddingLeft"],
      ["marginTop", "marginBottom"],
      ["marginRight", "marginLeft"],
    ];
  }

  return groups.find((group) => group.includes(property)) ?? [property];
};
