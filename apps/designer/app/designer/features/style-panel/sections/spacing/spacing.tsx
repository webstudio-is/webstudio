import { StyleValue } from "@webstudio-is/css-data";
import { numericScrubControl } from "@webstudio-is/design-system";
import { useState, useEffect, useRef } from "react";
import { getFinalValue } from "../../shared/get-final-value";
import type { RenderCategoryProps } from "../../style-sections";
import { type PropertyName, type HoverTagret, SpacingLayout } from "./layout";
import { ValueText } from "./value-text";

type StyleValueWithUnit = Extract<StyleValue, { type: "unit" }>;

type ScrubStatus =
  | { isActive: false }
  | { isActive: true; property: PropertyName; value: StyleValueWithUnit };

const useScrub = (
  props: {
    target: HoverTagret | undefined;
    onChange: (event: {
      property: PropertyName;
      value: StyleValueWithUnit;
      isEphemeral: boolean;
    }) => void;
  } & Pick<RenderCategoryProps, "currentStyle" | "inheritedStyle">
): ScrubStatus => {
  // we want to hold on to the target while scrub is active even if hover changes
  const [activeTarget, setActiveTarget] = useState<HoverTagret>();
  const finalTarget = activeTarget ?? props.target;

  const [value, setValue] = useState<StyleValueWithUnit>();

  // we need this in useEffect, but don't it as a dependency
  const latestProps = useRef(props);
  latestProps.current = props;

  const unitRef = useRef<StyleValueWithUnit["unit"]>();

  useEffect(() => {
    if (finalTarget === undefined) {
      return;
    }

    const property = finalTarget.property;

    const scrub = numericScrubControl(finalTarget.element, {
      direction:
        property.endsWith("Left") || property.endsWith("Right")
          ? "horizontal"
          : "vertical",
      getValue() {
        const { currentStyle, inheritedStyle } = latestProps.current;
        const value = getFinalValue({
          property: property,
          currentStyle,
          inheritedStyle,
        });
        if (value?.type === "unit") {
          unitRef.current = value.unit;
          return value.value;
        }
      },
      onValueInput(event) {
        // for TypeScript
        if (unitRef.current === undefined) {
          return;
        }

        const value = {
          type: "unit",
          value: event.value,
          unit: unitRef.current,
        } as const;

        setValue(value);
        latestProps.current.onChange({ property, value, isEphemeral: true });
      },
      onValueChange(event) {
        // for TypeScript
        if (unitRef.current === undefined) {
          return;
        }

        const value = {
          type: "unit",
          value: event.value,
          unit: unitRef.current,
        } as const;

        latestProps.current.onChange({ property, value, isEphemeral: false });
      },
      onStatusChange(status) {
        setActiveTarget(
          status === "scrubbing" ? latestProps.current.target : undefined
        );
      },
    });

    return scrub.disconnectedCallback;
  }, [finalTarget]);

  return activeTarget === undefined || value === undefined
    ? { isActive: false }
    : { isActive: true, property: activeTarget.property, value };
};

const Cell = ({
  property,
  isHovered,
  scrubStatus,
  currentStyle,
  inheritedStyle,
}: {
  property: PropertyName;
  isHovered: boolean;
  scrubStatus: ScrubStatus;
} & Pick<RenderCategoryProps, "currentStyle" | "inheritedStyle">) => {
  const styleValue = getFinalValue({
    property,
    currentStyle,
    inheritedStyle,
  });

  const finalValue = scrubStatus.isActive ? scrubStatus.value : styleValue;

  return finalValue === undefined ? null : (
    <ValueText
      value={finalValue}
      isHovered={isHovered || scrubStatus.isActive}
      source="set" // @todo: set correct source
    />
  );
};

export const SpacingSection = ({
  setProperty,
  currentStyle,
  inheritedStyle,
}: RenderCategoryProps) => {
  const [hoverTarget, setHoverTarget] = useState<HoverTagret>();

  const scrubStatus = useScrub({
    target: hoverTarget,
    onChange: ({ property, value, isEphemeral }) => {
      setProperty(property)(value, { isEphemeral });
    },
    currentStyle,
    inheritedStyle,
  });

  return (
    <SpacingLayout
      onClick={() => undefined}
      onHover={setHoverTarget}
      forceHoverStateFor={
        scrubStatus.isActive ? scrubStatus.property : undefined
      }
      renderCell={({ property }) => (
        <Cell
          property={property}
          scrubStatus={
            scrubStatus.isActive && scrubStatus.property === property
              ? scrubStatus
              : { isActive: false }
          }
          isHovered={hoverTarget?.property === property}
          currentStyle={currentStyle}
          inheritedStyle={inheritedStyle}
        />
      )}
    />
  );
};
