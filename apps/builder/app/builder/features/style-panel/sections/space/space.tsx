import { useState, useRef } from "react";
import { SpaceLayout } from "./layout";
import { ValueText } from "../shared/value-text";
import { getSpaceModifiersGroup, useScrub } from "../shared/scrub";
import { spaceProperties } from "./properties";
import type { SpaceStyleProperty, HoverTarget } from "./types";
import { InputPopover } from "../shared/input-popover";
import { SpaceTooltip } from "./tooltip";
import { StyleSection } from "../../shared/style-section";
import { movementMapSpace, useKeyboardNavigation } from "../shared/keyboard";
import { useComputedStyleDecl, useComputedStyles } from "../../shared/model";
import { createBatchUpdate, deleteProperty } from "../../shared/use-style-data";

const Cell = ({
  isPopoverOpen,
  onPopoverClose,
  onHover,
  property,
  scrubStatus,
}: {
  isPopoverOpen: boolean;
  onPopoverClose: () => void;
  onHover: (target: HoverTarget | undefined) => void;
  property: SpaceStyleProperty;
  scrubStatus: ReturnType<typeof useScrub>;
}) => {
  const styleDecl = useComputedStyleDecl(property);
  const finalValue =
    (scrubStatus.isActive && scrubStatus.values[property]) ||
    styleDecl.cascadedValue;

  return (
    <>
      <InputPopover
        styleSource={styleDecl.source.name}
        value={finalValue}
        isOpen={isPopoverOpen}
        property={property}
        onClose={onPopoverClose}
      />
      <SpaceTooltip property={property} preventOpen={scrubStatus.isActive}>
        <ValueText
          css={{
            // We want value to have `default` cursor to indicate that it's clickable,
            // unlike the rest of the value area that has cursor that indicates scrubbing.
            // Click and scrub works everywhere anyway, but we want cursors to be different.
            //
            // In order to have control over cursor we're setting pointerEvents to "all" here
            // because SpaceLayout sets it to "none" for cells' content.
            pointerEvents: "all",
          }}
          value={finalValue}
          source={styleDecl.source.name}
          onMouseEnter={(event) =>
            onHover({ property, element: event.currentTarget })
          }
          onMouseLeave={() => onHover(undefined)}
        />
      </SpaceTooltip>
    </>
  );
};

export { spaceProperties as properties };

export const Section = () => {
  const styles = useComputedStyles(spaceProperties);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>();

  const scrubStatus = useScrub({
    value: styles.find(
      (styleDecl) => styleDecl.property === hoverTarget?.property
    )?.usedValue,
    target: hoverTarget,
    getModifiersGroup: getSpaceModifiersGroup,
    onChange: (values, options) => {
      const batch = createBatchUpdate();
      for (const property of spaceProperties) {
        const value = values[property];
        if (value !== undefined) {
          batch.setProperty(property)(value);
        }
      }
      batch.publish(options);
    },
  });

  const [openProperty, setOpenProperty] = useState<SpaceStyleProperty>();

  const layoutRef = useRef<HTMLDivElement>(null);

  const keyboardNavigation = useKeyboardNavigation({
    onOpen: setOpenProperty,
    movementMap: movementMapSpace,
  });

  // by deafult highlight hovered or scrubbed properties
  let activeProperties = scrubStatus.properties;

  // if keyboard navigation is active, highlight its active property
  if (keyboardNavigation.isActive) {
    activeProperties = [keyboardNavigation.activeProperty];
  }

  // if popover is open, highlight its property and hovered properties
  if (openProperty !== undefined) {
    activeProperties = [openProperty, ...scrubStatus.properties];
  }

  const handleHover = (target: HoverTarget | undefined) => {
    setHoverTarget(target);
    keyboardNavigation.handleHover(target?.property);
  };

  return (
    <StyleSection label="Space" properties={spaceProperties}>
      <SpaceLayout
        ref={layoutRef}
        onClick={(event) => {
          const property = hoverTarget?.property;
          if (event.altKey && property) {
            deleteProperty(property);
            return;
          }
          setOpenProperty(property);
        }}
        onHover={handleHover}
        onFocus={keyboardNavigation.handleFocus}
        onBlur={keyboardNavigation.handleBlur}
        activeProperties={activeProperties}
        onKeyDown={keyboardNavigation.handleKeyDown}
        onMouseMove={keyboardNavigation.handleMouseMove}
        onMouseLeave={keyboardNavigation.handleMouseLeave}
        renderCell={({ property }) => (
          <Cell
            isPopoverOpen={openProperty === property}
            onPopoverClose={() => {
              if (openProperty === property) {
                setOpenProperty(undefined);
                layoutRef.current?.focus();
              }
            }}
            onHover={handleHover}
            property={property}
            scrubStatus={scrubStatus}
          />
        )}
      />
    </StyleSection>
  );
};
