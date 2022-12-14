import { useState } from "react";
import { getFinalValue } from "../../shared/get-final-value";
import type { RenderCategoryProps } from "../../style-sections";
import { type HoverTagret, SpacingLayout } from "./layout";
import { ValueText } from "./value-text";
import { useScrub } from "./scrub";
import type { StyleChangeEvent, SpacingStyleProperty } from "./types";
import { InputPopover } from "./input-popover";

const Cell = ({
  isPopoverOpen,
  onChange,
  onPopoverClose,
  property,
  isHovered,
  scrubStatus,
  currentStyle,
  inheritedStyle,
}: {
  isPopoverOpen: boolean;
  onPopoverClose: () => void;
  onChange: (event: StyleChangeEvent) => void;
  property: SpacingStyleProperty;
  isHovered: boolean;
  scrubStatus: ReturnType<typeof useScrub>;
} & Pick<RenderCategoryProps, "currentStyle" | "inheritedStyle">) => {
  const styleValue = getFinalValue({
    property,
    currentStyle,
    inheritedStyle,
  });

  const finalValue = scrubStatus.isActive ? scrubStatus.value : styleValue;

  // for TypeScript
  if (finalValue === undefined) {
    return null;
  }

  return (
    <InputPopover
      value={finalValue}
      isOpen={isPopoverOpen}
      property={property}
      onChange={onChange}
      onClose={onPopoverClose}
    >
      <ValueText
        value={finalValue}
        isActive={isHovered || scrubStatus.isActive || isPopoverOpen}
        source="set" // @todo: set correct source
      />
    </InputPopover>
  );
};

export const SpacingSection = ({
  setProperty,
  currentStyle,
  inheritedStyle,
}: RenderCategoryProps) => {
  const [hoverTarget, setHoverTarget] = useState<HoverTagret>();

  const handleChange = ({ property, value, isEphemeral }: StyleChangeEvent) =>
    setProperty(property)(value, { isEphemeral });

  const scrubStatus = useScrub({
    target: hoverTarget,
    onChange: handleChange,
    currentStyle,
    inheritedStyle,
  });

  const [openProperty, setOpenProperty] = useState<SpacingStyleProperty>();

  return (
    <SpacingLayout
      onClick={setOpenProperty}
      onHover={setHoverTarget}
      forceHoverStateFor={
        scrubStatus.isActive ? scrubStatus.property : openProperty
      }
      renderCell={({ property }) => (
        <Cell
          isPopoverOpen={openProperty === property}
          onPopoverClose={() => {
            if (openProperty === property) {
              setOpenProperty(undefined);
            }
          }}
          onChange={handleChange}
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
