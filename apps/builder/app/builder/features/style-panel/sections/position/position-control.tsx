import { Grid, theme } from "@webstudio-is/design-system";
import { PositionLayout, type PositionProperty } from "./position-layout";
import { movementMapPosition, useKeyboardNavigation } from "../shared/keyboard";
import { useRef, useState, type ComponentProps } from "react";
import type {
  CreateBatchUpdate,
  DeleteProperty,
  SetProperty,
} from "../../shared/use-style-data";
import { getStyleSource, type StyleInfo } from "../../shared/style-info";
import { getPositionModifiersGroup, useScrub } from "../shared/scrub";
import { ValueText } from "../shared/value-text";
import type { StyleValue } from "@webstudio-is/css-engine";
import { InputPopover } from "../shared/input-popover";
import { PositionTooltip } from "./position-tooltip";

const Cell = ({
  scrubStatus,
  currentStyle,
  property,
  onHover,
  isPopoverOpen,
  onPopoverClose,
  onChange,
  createBatchUpdate,
}: {
  isPopoverOpen: boolean;
  onPopoverClose: () => void;
  onChange: ComponentProps<typeof InputPopover>["onChange"];
  scrubStatus: ReturnType<typeof useScrub>;
  currentStyle: StyleInfo;
  property: PositionProperty;
  onHover: (target: HoverTarget | undefined) => void;
  createBatchUpdate: CreateBatchUpdate;
}) => {
  const styleInfo = currentStyle[property];
  const finalValue: StyleValue | undefined = scrubStatus.isActive
    ? scrubStatus.values[property] ?? styleInfo?.value
    : styleInfo?.value;
  const styleSource = getStyleSource(styleInfo);

  if (finalValue === undefined) {
    return null;
  }

  return (
    <>
      <InputPopover
        styleSource={styleSource}
        value={finalValue}
        isOpen={isPopoverOpen}
        property={property}
        onChange={onChange}
        onClose={onPopoverClose}
      />
      <PositionTooltip
        property={property}
        style={currentStyle}
        createBatchUpdate={createBatchUpdate}
        preventOpen={scrubStatus.isActive}
      >
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
          source={styleSource}
          onMouseEnter={(event) =>
            onHover({ property, element: event.currentTarget })
          }
          onMouseLeave={() => onHover(undefined)}
        />
      </PositionTooltip>
    </>
  );
};

type HoverTarget = {
  element: HTMLElement;
  property: PositionProperty;
};

type PositionControlProps = {
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  createBatchUpdate: CreateBatchUpdate;
  currentStyle: StyleInfo;
};

export const PositionControl = ({
  createBatchUpdate,
  currentStyle,
  deleteProperty,
  setProperty,
}: PositionControlProps) => {
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>();

  const scrubStatus = useScrub({
    value:
      hoverTarget === undefined
        ? undefined
        : currentStyle[hoverTarget.property]?.value,
    target: hoverTarget,
    getModifiersGroup: getPositionModifiersGroup,
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

  const [openProperty, setOpenProperty] = useState<PositionProperty>();

  const layoutRef = useRef<HTMLDivElement>(null);

  const keyboardNavigation = useKeyboardNavigation({
    onOpen: setOpenProperty,
    movementMap: movementMapPosition,
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
          outline: `2px solid ${theme.colors.blue10}`,
        },
      }}
      onFocus={keyboardNavigation.handleFocus}
      onBlur={keyboardNavigation.handleBlur}
      onKeyDown={keyboardNavigation.handleKeyDown}
      onMouseMove={keyboardNavigation.handleMouseMove}
      onMouseLeave={keyboardNavigation.handleMouseLeave}
      onClick={(event) => {
        const property = hoverTarget?.property;
        if (event.altKey && property) {
          deleteProperty(property);
          return;
        }
        setOpenProperty(property);
      }}
    >
      <PositionLayout
        activeProperties={activeProperties}
        renderCell={(property) => (
          <Cell
            scrubStatus={scrubStatus}
            currentStyle={currentStyle}
            property={property}
            onHover={handleHover}
            isPopoverOpen={openProperty === property}
            onPopoverClose={() => {
              if (openProperty === property) {
                setOpenProperty(undefined);
                layoutRef.current?.focus();
              }
            }}
            onChange={(update, options) => {
              if (update.operation === "set") {
                setProperty(update.property)(update.value, options);
              } else {
                deleteProperty(update.property, options);
              }
            }}
            createBatchUpdate={createBatchUpdate}
          />
        )}
        onHover={handleHover}
      />
    </Grid>
  );
};
