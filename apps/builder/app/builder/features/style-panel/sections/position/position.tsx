import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { Grid, theme } from "@webstudio-is/design-system";
import { SelectControl, TextControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";
import { PositionControl } from "./position-control";
import { useParentStyle } from "../../parent-style";

const properties: StyleProperty[] = ["position"];

const positionControlVisibleProperties = [
  "relative",
  "absolute",
  "fixed",
  "sticky",
] as const;

const zIndexParents = ["flex", "grid", "inline-flex", "inline-grid"] as const;

export const PositionSection = ({
  setProperty,
  deleteProperty,
  currentStyle,
  createBatchUpdate,
}: RenderCategoryProps) => {
  const parentStyle = useParentStyle();

  const positionValue = currentStyle.position?.value;

  const showPositionControls =
    positionValue?.type === "keyword" &&
    positionControlVisibleProperties.includes(positionValue.value as never);

  const showZindexControl =
    showPositionControls ||
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
          <PropertyName
            label={styleConfigByName("position").label}
            properties={["position"]}
            style={currentStyle}
            onReset={() => deleteProperty("position")}
          />
          <SelectControl
            property={"position"}
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
            items={positionItems}
          />
          {showZindexControl && showPositionControls === false && (
            <>
              <PropertyName
                label={styleConfigByName("zIndex").label}
                properties={["zIndex"]}
                style={currentStyle}
                onReset={() => deleteProperty("zIndex")}
              />
              <TextControl
                property={"zIndex"}
                currentStyle={currentStyle}
                setProperty={setProperty}
                deleteProperty={deleteProperty}
              />
            </>
          )}
        </Grid>

        {showPositionControls && (
          <Grid gap={3} columns={2}>
            <PositionControl
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
              createBatchUpdate={createBatchUpdate}
            />
            <Grid gap={1}>
              <PropertyName
                label={styleConfigByName("zIndex").label}
                properties={["zIndex"]}
                style={currentStyle}
                onReset={() => deleteProperty("zIndex")}
              />
              <TextControl
                property={"zIndex"}
                currentStyle={currentStyle}
                setProperty={setProperty}
                deleteProperty={deleteProperty}
              />
            </Grid>
          </Grid>
        )}
      </Grid>
    </CollapsibleSection>
  );
};
