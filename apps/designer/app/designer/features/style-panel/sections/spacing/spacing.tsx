import { useState } from "react";
import { getFinalValue } from "../../shared/get-final-value";
import { useIsFromCurrentBreakpoint } from "../../shared/use-is-from-current-breakpoint";
import type { RenderCategoryProps } from "../../style-sections";
import { SpacingLayout } from "./layout";
import { ValueText } from "./value-text";
import { useScrub } from "./scrub";
import type {
  StyleChangeEvent,
  SpacingStyleProperty,
  HoverTagret,
} from "./types";
import { InputPopover } from "./input-popover";
import { SpacingTooltip } from "./tooltip";

const Cell = ({
  isPopoverOpen,
  onPopoverClose,
  onChange,
  property,
  isActive,
  scrubStatus,
  currentStyle,
  inheritedStyle,
}: {
  isPopoverOpen: boolean;
  onPopoverClose: () => void;
  onChange: (event: StyleChangeEvent) => void;
  property: SpacingStyleProperty;
  isActive: boolean;
  scrubStatus: ReturnType<typeof useScrub>;
} & Pick<RenderCategoryProps, "currentStyle" | "inheritedStyle">) => {
  const isFromCurrentBreakpoint = useIsFromCurrentBreakpoint(property);

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
    <>
      <InputPopover
        value={finalValue}
        isOpen={isPopoverOpen}
        property={property}
        onChange={onChange}
        onClose={onPopoverClose}
      />
      <SpacingTooltip
        property={property}
        isOpen={
          isActive && isPopoverOpen === false && scrubStatus.isActive === false
        }
      />
      <ValueText
        value={finalValue}
        isActive={isActive}
        source={isFromCurrentBreakpoint ? "set" : "unset"}
      />
    </>
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

  const activeProperty = scrubStatus.isActive
    ? scrubStatus.property
    : openProperty ?? hoverTarget?.property;

  return (
    <SpacingLayout
      onClick={setOpenProperty}
      onHover={setHoverTarget}
      activeProperty={activeProperty}
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
          isActive={activeProperty === property}
          currentStyle={currentStyle}
          inheritedStyle={inheritedStyle}
        />
      )}
    />
  );
};
