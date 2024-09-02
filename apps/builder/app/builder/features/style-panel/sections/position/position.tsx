import type { StyleProperty } from "@webstudio-is/css-engine";
import type { SectionProps } from "../shared/section";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { Grid, theme } from "@webstudio-is/design-system";
import { SelectControl, TextControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import { InsetControl } from "./inset-control";
import { useParentStyle } from "../../parent-style";
import { PropertyLabel } from "../../property-label";
import { propertyDescriptions } from "@webstudio-is/css-data";

export const properties = [
  "position",
  "zIndex",
  "top",
  "right",
  "bottom",
  "left",
] satisfies Array<StyleProperty>;

const positionControlVisibleProperties = [
  "relative",
  "absolute",
  "fixed",
  "sticky",
] as const;

const zIndexParents = ["flex", "grid", "inline-flex", "inline-grid"] as const;

export const Section = ({
  deleteProperty,
  currentStyle,
  createBatchUpdate,
}: SectionProps) => {
  const parentStyle = useParentStyle();

  const positionValue = currentStyle.position?.value;

  const showInsetControl =
    positionValue?.type === "keyword" &&
    positionControlVisibleProperties.includes(positionValue.value as never);

  const showZindexControl =
    showInsetControl ||
    (parentStyle?.display?.value.type === "keyword" &&
      zIndexParents.includes(parentStyle?.display?.value.value as never));

  const { items: unfilteredPositionItems } = styleConfigByName("position");

  // Filter out "inherit" as we have no a good way to handle it
  // @todo remove after https://github.com/webstudio-is/webstudio/issues/1536
  const positionItems = unfilteredPositionItems.filter(
    (item) => item.name !== "inherit"
  );

  return (
    <CollapsibleSection
      label="Position"
      currentStyle={currentStyle}
      properties={properties}
    >
      <Grid gap={2}>
        <Grid
          gap={2}
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[23]}`,
          }}
        >
          <PropertyLabel
            label="Position"
            description={propertyDescriptions.position}
            properties={["position"]}
          />
          <SelectControl property="position" items={positionItems} />
          {showZindexControl && showInsetControl === false && (
            <>
              <PropertyLabel
                label="Z Index"
                description={propertyDescriptions.zIndex}
                properties={["zIndex"]}
              />
              <TextControl property="zIndex" />
            </>
          )}
        </Grid>

        {showInsetControl && (
          <Grid gap={3} columns={2}>
            <InsetControl
              currentStyle={currentStyle}
              deleteProperty={deleteProperty}
              createBatchUpdate={createBatchUpdate}
            />
            <Grid gap={1}>
              <PropertyLabel
                label="Z Index"
                description={propertyDescriptions.zIndex}
                properties={["zIndex"]}
              />
              <TextControl property="zIndex" />
            </Grid>
          </Grid>
        )}
      </Grid>
    </CollapsibleSection>
  );
};
