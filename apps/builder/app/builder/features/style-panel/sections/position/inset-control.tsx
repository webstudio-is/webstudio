import { useRef, useState } from "react";
import { Grid, theme } from "@webstudio-is/design-system";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import { useKeyboardNavigation } from "../shared/keyboard";
import { createBatchUpdate, deleteProperty } from "../../shared/use-style-data";
import { useScrub } from "../shared/scrub";
import { ValueText } from "../shared/value-text";
import { useComputedStyleDecl, useComputedStyles } from "../../shared/model";
import { useModifierKeys, type Modifiers } from "../../shared/modifier-keys";
import { InputPopover } from "../shared/input-popover";
import { InsetLayout, type InsetProperty } from "./inset-layout";
import { getInsetModifiersGroup, InsetTooltip } from "./inset-tooltip";

const movementMapInset = {
  top: ["bottom", "right", "bottom", "left"],
  right: ["top", "left", "bottom", "left"],
  bottom: ["top", "right", "top", "left"],
  left: ["top", "right", "bottom", "right"],
} as const;

const Cell = ({
  scrubStatus,
  property,
  getActiveProperties,
  onHover,
  isPopoverOpen,
  onPopoverClose,
}: {
  isPopoverOpen: boolean;
  onPopoverClose: () => void;
  scrubStatus: ReturnType<typeof useScrub>;
  property: InsetProperty;
  getActiveProperties: (modifiers?: Modifiers) => CssProperty[];
  onHover: (target: HoverTarget | undefined) => void;
}) => {
  const styleDecl = useComputedStyleDecl(property);
  const finalValue: StyleValue | undefined =
    (scrubStatus.isActive && scrubStatus.values[property]) ||
    styleDecl.cascadedValue;

  return (
    <>
      <InputPopover
        styleSource={styleDecl.source.name}
        value={finalValue}
        isOpen={isPopoverOpen}
        property={property}
        getActiveProperties={getActiveProperties}
        onClose={onPopoverClose}
      />
      <InsetTooltip property={property} preventOpen={scrubStatus.isActive}>
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
      </InsetTooltip>
    </>
  );
};

type HoverTarget = {
  element: HTMLElement;
  property: InsetProperty;
};

export const InsetControl = () => {
  const styles = useComputedStyles(["top", "right", "bottom", "left"]);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>();

  const scrubStatus = useScrub({
    value: styles.find(
      (styleDecl) => styleDecl.property === hoverTarget?.property
    )?.usedValue,
    target: hoverTarget,
    getModifiersGroup: getInsetModifiersGroup,
    onChange: (values, options) => {
      const batch = createBatchUpdate();
      for (const property of ["top", "right", "bottom", "left"] as const) {
        const value = values[property];
        if (value !== undefined) {
          batch.setProperty(property)(value);
        }
      }
      batch.publish(options);
    },
  });

  const [openProperty, setOpenProperty] = useState<InsetProperty>();
  const [activePopoverProperties, setActivePopoverProperties] = useState<
    undefined | CssProperty[]
  >();
  const modifiers = useModifierKeys();
  const handleOpenProperty = (property: undefined | InsetProperty) => {
    setOpenProperty(property);
    setActivePopoverProperties(
      property ? getInsetModifiersGroup(property, modifiers) : undefined
    );
  };

  const layoutRef = useRef<HTMLDivElement>(null);

  const keyboardNavigation = useKeyboardNavigation({
    onOpen: handleOpenProperty,
    movementMap: movementMapInset,
  });

  // by deafult highlight hovered or scrubbed properties
  // if popover is open, highlight its property and hovered properties
  const activeProperties = [
    ...(activePopoverProperties ?? scrubStatus.properties),
  ];
  // if keyboard navigation is active, highlight its active property
  if (keyboardNavigation.isActive) {
    activeProperties.push(keyboardNavigation.activeProperty);
  }
  const getActiveProperties = (modifiers?: Modifiers) => {
    return modifiers && openProperty
      ? getInsetModifiersGroup(openProperty, modifiers)
      : activeProperties;
  };

  const handleHover = (target: HoverTarget | undefined) => {
    setHoverTarget(target);
    keyboardNavigation.handleHover(target?.property);
  };

  return (
    <Grid
      ref={layoutRef}
      tabIndex={0}
      css={{
        // Create stacking context to prevent z-index issues with internal z-indexes
        zIndex: 0,
        // InputPopover is not working properly without position relative
        position: "relative",
        width: theme.spacing[22],
        height: theme.spacing[18],
        "&:focus-visible": {
          borderRadius: theme.borderRadius[3],
          outline: `1px solid ${theme.colors.backgroundPrimary}`,
          outlineOffset: -1,
        },
      }}
      onFocus={keyboardNavigation.handleFocus}
      onBlur={keyboardNavigation.handleBlur}
      onKeyDown={keyboardNavigation.handleKeyDown}
      onMouseMove={keyboardNavigation.handleMouseMove}
      onMouseLeave={keyboardNavigation.handleMouseLeave}
      onClick={(event) => {
        const property = hoverTarget?.property;
        const styleValueSource = styles.find(
          (styleDecl) => styleDecl.property === property
        )?.source.name;
        if (
          event.altKey &&
          property &&
          // reset when the value is set and after try to edit two sides
          (styleValueSource === "local" || styleValueSource === "overwritten")
        ) {
          deleteProperty(property);
          return;
        }
        handleOpenProperty(property);
      }}
    >
      <InsetLayout
        getActiveProperties={getActiveProperties}
        renderCell={(property) => (
          <Cell
            scrubStatus={scrubStatus}
            property={property}
            getActiveProperties={getActiveProperties}
            onHover={handleHover}
            isPopoverOpen={openProperty === property}
            onPopoverClose={() => {
              if (openProperty === property) {
                handleOpenProperty(undefined);
                layoutRef.current?.focus();
              }
            }}
          />
        )}
        onHover={handleHover}
      />
    </Grid>
  );
};
