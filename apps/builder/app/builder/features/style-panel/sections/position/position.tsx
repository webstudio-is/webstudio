import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import { Grid, theme } from "@webstudio-is/design-system";
import { propertyDescriptions } from "@webstudio-is/css-data";
import { StyleSection } from "../../shared/style-section";
import { SelectControl, TextControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import { PropertyLabel } from "../../property-label";
import {
  useComputedStyleDecl,
  useParentComputedStyleDecl,
} from "../../shared/model";
import { InsetControl } from "./inset-control";

export const properties = [
  "position",
  "zIndex",
  "top",
  "right",
  "bottom",
  "left",
] satisfies Array<StyleProperty>;

export const Section = () => {
  const position = useComputedStyleDecl("position");
  const positionValue = toValue(position.computedValue);
  const showInsetControl =
    positionValue === "relative" ||
    positionValue === "absolute" ||
    positionValue === "fixed" ||
    positionValue === "sticky";

  const parentDisplay = useParentComputedStyleDecl("display");
  const parentDisplayValue = toValue(parentDisplay.computedValue);
  const showZindexControl =
    showInsetControl ||
    parentDisplayValue === "flex" ||
    parentDisplayValue === "grid" ||
    parentDisplayValue === "inline-flex" ||
    parentDisplayValue === "inline-grid";

  return (
    <StyleSection label="Position" properties={properties}>
      <Grid gap={2}>
        <Grid gap={2} css={{ gridTemplateColumns: `1fr ${theme.spacing[23]}` }}>
          <PropertyLabel
            label="Position"
            description={propertyDescriptions.position}
            properties={["position"]}
          />
          <SelectControl
            property="position"
            items={styleConfigByName("position").items}
          />
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
            <InsetControl />
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
    </StyleSection>
  );
};
