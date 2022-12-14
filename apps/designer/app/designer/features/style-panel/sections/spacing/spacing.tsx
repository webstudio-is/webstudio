import { useState } from "react";
import { getFinalValue } from "../../shared/get-final-value";
import type { RenderCategoryProps } from "../../style-sections";
import { type PropertyName, type HoverTagret, SpacingLayout } from "./layout";
import { ValueText } from "./value-text";
import { useScrub } from "./scrub";

const Cell = ({
  property,
  isHovered,
  scrubStatus,
  currentStyle,
  inheritedStyle,
}: {
  property: PropertyName;
  isHovered: boolean;
  scrubStatus: ReturnType<typeof useScrub>;
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
