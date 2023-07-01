import type { StyleProperty } from "@webstudio-is/css-data";
import { Grid } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";
import { SelectControl, TextControl } from "../../controls";

import { CollapsibleSection } from "../../shared/collapsible-section";
import { theme } from "@webstudio-is/design-system";

const properties: StyleProperty[] = ["cursor", "opacity"];

export const EffectsSection = ({
  currentStyle: style,
  setProperty,
  deleteProperty,
}: RenderCategoryProps) => {
  return (
    <CollapsibleSection
      label="Effects"
      currentStyle={style}
      properties={properties}
    >
      <Grid
        gap={2}
        css={{
          gridTemplateColumns: `1fr ${theme.spacing[22]}`,
        }}
      >
        <PropertyName
          label={styleConfigByName("opacity").label}
          properties={["opacity"]}
          style={style}
          onReset={() => deleteProperty("opacity")}
        />
        <TextControl
          property={"opacity"}
          currentStyle={style}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <PropertyName
          label={"Blend Mode"}
          properties={["mixBlendMode"]}
          style={style}
          onReset={() => deleteProperty("mixBlendMode")}
        />
        <SelectControl
          property={"mixBlendMode"}
          currentStyle={style}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <PropertyName
          label={styleConfigByName("cursor").label}
          properties={["cursor"]}
          style={style}
          onReset={() => deleteProperty("cursor")}
        />
        <SelectControl
          property={"cursor"}
          currentStyle={style}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <PropertyName
          label={styleConfigByName("pointerEvents").label}
          properties={["pointerEvents"]}
          style={style}
          onReset={() => deleteProperty("pointerEvents")}
        />
        <SelectControl
          property={"pointerEvents"}
          currentStyle={style}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
        <PropertyName
          label={styleConfigByName("userSelect").label}
          properties={["userSelect"]}
          style={style}
          onReset={() => deleteProperty("userSelect")}
        />
        <SelectControl
          property={"userSelect"}
          currentStyle={style}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
    </CollapsibleSection>
  );
};
