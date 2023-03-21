import { Flex, Grid, theme } from "@webstudio-is/design-system";
import { ColorControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import type { RenderCategoryProps } from "../../style-sections";
import { BorderWidth } from "./border-width";

const { items: borderColorItems } = styleConfigByName["borderTopColor"];

export const BordersSection = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
}: RenderCategoryProps) => {
  return (
    <Flex css={{ px: theme.spacing[9] }} direction="column" gap={2}>
      <Grid css={{ gridTemplateColumns: "1fr 132px" }}>
        <PropertyName
          style={currentStyle}
          property={"borderTopColor"}
          label={"Color"}
          onReset={() => deleteProperty("borderTopColor")}
        />

        <ColorControl
          property={"borderTopColor"}
          items={borderColorItems}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
      <BorderWidth
        createBatchUpdate={createBatchUpdate}
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
    </Flex>
  );
};
