import { type ComponentProps, useState } from "react";
import type { RenderCategoryProps } from "../../style-sections";
import { SpacingLayout } from "./layout";
import { ValueText } from "./value-text";
import { useScrub } from "./scrub";
import { spacingPropertiesNames } from "./types";
import type { SpacingStyleProperty, HoverTagret } from "./types";
import { InputPopover } from "./input-popover";
import { SpacingTooltip } from "./tooltip";
import { getStyleSource } from "../../shared/style-info";

const Cell = ({
  isPopoverOpen,
  onPopoverClose,
  onChange,
  onHover,
  property,
  isActive,
  scrubStatus,
  currentStyle,
}: {
  isPopoverOpen: boolean;
  onPopoverClose: () => void;
  onChange: ComponentProps<typeof InputPopover>["onChange"];
  onHover: (target: HoverTagret | undefined) => void;
  property: SpacingStyleProperty;
  isActive: boolean;
  scrubStatus: ReturnType<typeof useScrub>;
  currentStyle: RenderCategoryProps["currentStyle"];
}) => {
  const styleInfo = currentStyle[property];
  const finalValue =
    (scrubStatus.isActive && scrubStatus.values[property]) || styleInfo?.value;
  const styleSource = getStyleSource(styleInfo);

  // for TypeScript
  if (finalValue === undefined) {
    return null;
  }

  let origin: "set" | "inherited" | "unset" = "unset";
  if (styleSource === "local") {
    origin = "set";
  }
  if (styleSource === "remote") {
    origin = "inherited";
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
      {isActive && isPopoverOpen === false && scrubStatus.isActive === false ? (
        <SpacingTooltip property={property} />
      ) : null}
      <ValueText
        css={{
          // We want value to have `default` cursor to indicate that it's clickable,
          // unlike the rest of the value area that has cursor that indicates scrubbing.
          // Click and scrub works everywhere anyway, but we want cursors to be different.
          //
          // In order to have control over cursor we're setting pointerEvents to "all" here
          // because SpacingLayout sets it to "none" for cells' content.
          pointerEvents: "all",
        }}
        value={finalValue}
        isActive={isActive}
        origin={origin}
        onMouseEnter={(event) =>
          onHover({ property, element: event.currentTarget })
        }
        onMouseLeave={() => onHover(undefined)}
      />
    </>
  );
};

export const SpacingSection = ({
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
      for (const property of spacingPropertiesNames) {
        const value = values[property];
        if (value !== undefined) {
          batch.setProperty(property)(value);
        }
      }
      batch.publish(options);
    },
  });

  const [openProperty, setOpenProperty] = useState<SpacingStyleProperty>();

  const activeProperties =
    openProperty === undefined ? scrubStatus.properties : [openProperty];

  return (
    <SpacingLayout
      onClick={() => setOpenProperty(hoverTarget?.property)}
      onHover={setHoverTarget}
      activeProperties={activeProperties}
      renderCell={({ property }) => (
        <Cell
          isPopoverOpen={openProperty === property}
          onPopoverClose={() => {
            if (openProperty === property) {
              setOpenProperty(undefined);
            }
          }}
          onChange={(update, options) => {
            if (update.operation === "set") {
              setProperty(update.property)(update.value, options);
            } else {
              deleteProperty(update.property, options);
            }
          }}
          onHover={setHoverTarget}
          property={property}
          scrubStatus={scrubStatus}
          isActive={activeProperties.includes(property)}
          currentStyle={currentStyle}
        />
      )}
    />
  );
};
