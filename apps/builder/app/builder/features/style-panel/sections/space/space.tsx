import {
  type ComponentProps,
  type FocusEvent,
  useState,
  useRef,
  type FocusEventHandler,
} from "react";
import type { RenderCategoryProps } from "../../style-sections";
import { SpaceLayout } from "./layout";
import { ValueText } from "./value-text";
import { useScrub } from "./scrub";
import { spacePropertiesNames } from "./types";
import type { SpaceStyleProperty, HoverTagret } from "./types";
import { InputPopover } from "./input-popover";
import { SpaceTooltip } from "./tooltip";
import { getStyleSource } from "../../shared/style-info";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { useKeyboardNavigation } from "./keyboard";
import { useDebouncedCallback } from "use-debounce";
import type { CreateBatchUpdate } from "../../shared/use-style-data";

const Cell = ({
  isPopoverOpen,
  onPopoverClose,
  onChange,
  onHover,
  property,
  isActive,
  scrubStatus,
  currentStyle,
  createBatchUpdate,
}: {
  isPopoverOpen: boolean;
  onPopoverClose: () => void;
  onChange: ComponentProps<typeof InputPopover>["onChange"];
  onHover: (target: HoverTagret | undefined) => void;
  property: SpaceStyleProperty;
  isActive: boolean;
  scrubStatus: ReturnType<typeof useScrub>;
  currentStyle: RenderCategoryProps["currentStyle"];
  createBatchUpdate: CreateBatchUpdate;
}) => {
  const styleInfo = currentStyle[property];
  const finalValue =
    (scrubStatus.isActive && scrubStatus.values[property]) || styleInfo?.value;
  const styleSource = getStyleSource(styleInfo);

  // for TypeScript
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
      <SpaceTooltip
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
          isActive={isActive}
          source={styleSource}
          onMouseEnter={(event) =>
            onHover({ property, element: event.currentTarget })
          }
          onMouseLeave={() => onHover(undefined)}
        />
      </SpaceTooltip>
    </>
  );
};

/**
 * useFocusWithin does't work with popovers, implement it using debounce
 */
const useFocusWithinDebounce = (
  props: {
    onFocusWithin: FocusEventHandler<Element>;
    onBlurWithin: FocusEventHandler<Element>;
  },
  timeout: number
) => {
  const isFocusedRef = useRef(false);

  const handleFocusBlur = useDebouncedCallback(
    (isFocus: boolean, event: FocusEvent<Element>) => {
      if (isFocus && isFocusedRef.current === false) {
        isFocusedRef.current = true;
        props.onFocusWithin(event);
        return;
      }
      if (isFocus === false && isFocusedRef.current === true) {
        isFocusedRef.current = false;
        props.onBlurWithin(event);
      }
    },
    timeout
  );

  const handleFocus = (event: FocusEvent<Element>) => {
    // ...event because we debounce handleFocusBlur, and react reuses events
    handleFocusBlur(true, { ...event });
  };

  const handleBlur = (event: FocusEvent<Element>) => {
    handleFocusBlur(false, event);
  };

  return {
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
};

export const SpaceSection = ({
  setProperty,
  deleteProperty,
  createBatchUpdate,
  currentStyle,
}: RenderCategoryProps) => {
  const [hoverTarget, setHoverTarget] = useState<HoverTagret>();

  const scrubStatus = useScrub({
    value:
      hoverTarget === undefined
        ? undefined
        : currentStyle[hoverTarget.property]?.value,
    target: hoverTarget,
    onChange: (values, options) => {
      const batch = createBatchUpdate();
      for (const property of spacePropertiesNames) {
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
  });

  const focusProps = useFocusWithinDebounce(
    {
      onFocusWithin: keyboardNavigation.handleFocus,
      onBlurWithin: keyboardNavigation.handleBlur,
    },
    100
  );

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

  const handleHoverUndefined = useDebouncedCallback(() => {
    setHoverTarget(undefined);
    keyboardNavigation.handleHover(undefined);
  }, 100);

  const handleHover = (target: HoverTagret | undefined) => {
    if (target === undefined) {
      // Debounce the mouseleave event to prevent delays when moving between cells.
      // This resolves the issue where the tooltip content changes when repositioned (e.g., when alt/shift clicked),
      // causing rapid mouseleave and mouseenter events in the space section.
      handleHoverUndefined();
      return;
    }
    handleHoverUndefined.cancel();
    setHoverTarget(target);
    keyboardNavigation.handleHover(target?.property);
  };

  const activeProperty = keyboardNavigation.isActive
    ? keyboardNavigation.activeProperty
    : hoverTarget?.property;

  return (
    <CollapsibleSection
      label="Space"
      currentStyle={currentStyle}
      properties={spacePropertiesNames}
    >
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
        onFocus={focusProps.onFocus}
        onBlur={focusProps.onBlur}
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
            onChange={(update, options) => {
              if (update.operation === "set") {
                setProperty(update.property)(update.value, options);
              } else {
                deleteProperty(update.property, options);
              }
            }}
            onHover={handleHover}
            property={property}
            scrubStatus={scrubStatus}
            isActive={activeProperty === property}
            currentStyle={currentStyle}
            createBatchUpdate={createBatchUpdate}
          />
        )}
      />
    </CollapsibleSection>
  );
};
