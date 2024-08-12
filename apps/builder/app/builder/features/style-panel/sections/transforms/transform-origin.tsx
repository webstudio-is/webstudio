import type { SectionProps } from "../shared/section";
import { Label, Flex, Grid, theme } from "@webstudio-is/design-system";
import { type StyleProperty } from "@webstudio-is/css-engine";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";

const property: StyleProperty = "transformOrigin";

export const TransformOrigin = (props: SectionProps) => {
  const { currentStyle, deleteProperty } = props;
  const value = currentStyle[property]?.local;
  const { label } = styleConfigByName(property);

  if (value?.type !== "tuple") {
    return;
  }

  return (
    <Flex
      direction="column"
      gap="2"
      css={{
        px: theme.spacing[9],
      }}
    >
      <PropertyName
        label={label}
        properties={[property]}
        style={currentStyle}
        onReset={() => deleteProperty(property)}
      />
      <Flex gap="6">
        <Grid
          css={{ gridTemplateColumns: "max-content 1fr" }}
          align="center"
          gapX="2"
        >
          <Label>Left</Label>
          <Label>Top</Label>
        </Grid>
      </Flex>
    </Flex>
  );
};
