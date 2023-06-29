import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { Grid, theme } from "@webstudio-is/design-system";
import { SelectControl, TextControl } from "../../controls";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";
import { PositionControl } from "./position-control";

const properties: StyleProperty[] = ["position"];

export const PositionSection = ({
  setProperty,
  deleteProperty,
  currentStyle,
  createBatchUpdate,
}: RenderCategoryProps) => (
  <CollapsibleSection
    label="Position"
    currentStyle={currentStyle}
    properties={properties}
  >
    <Grid gap={2}>
      <Grid
        gap={2}
        css={{
          gridTemplateColumns: `1fr ${theme.spacing[24]}`,
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
        />
      </Grid>
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
    </Grid>
  </CollapsibleSection>
);
