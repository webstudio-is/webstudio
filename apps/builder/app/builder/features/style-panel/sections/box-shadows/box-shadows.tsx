import { useState } from "react";
import type { StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import {
  Flex,
  theme,
  Grid,
  styled,
  SectionTitle,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { BoxShadowControls } from "./box-shadow-control";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";
import type { ReactNode } from "react";

const property: StyleProperty = "boxShadow";

const ItemButtonn = styled("button", {
  appearance: "none",
  width: "100%",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "start",
  userSelect: "none",
  backgroundColor: theme.colors.backgroundPanel,
  padding: 0,
  fontSize: 12,
  textAlign: "left",
  paddingLeft: theme.spacing[6],
  paddingRight: theme.spacing[9],

  height: theme.spacing[13],
  position: "relative",

  "&:hover, &[data-active=true]": {
    backgroundColor: theme.colors.backgroundHover,
  },
});

const Layer: React.FC<{ value: string } & RenderCategoryProps> = ({
  value,
  currentStyle,
}) => {
  return (
    <FloatingPanel title="Box Shadow" content={<div>Testing</div>}>
      <ItemButtonn>{value}</ItemButtonn>
    </FloatingPanel>
  );
};

export const BoxShadows = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const boxShadowValue = currentStyle[property]?.value;
  const layers =
    boxShadowValue?.type === "layers" &&
    boxShadowValue.value.length > 0 &&
    boxShadowValue.value;

  console.log(layers);

  return (
    <BoxShadowWrapper label="Box Shadow">
      <Flex direction="column">
        <Grid
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[20]}`,
            paddingRight: theme.spacing[6],
            paddingLeft: theme.spacing[9],
          }}
          gapX={2}
        >
          <PropertyName
            label={"Box Shadows"}
            style={currentStyle}
            property={property}
            onReset={() => deleteProperty(property)}
          />
          <BoxShadowControls
            currentStyle={currentStyle}
            deleteProperty={deleteProperty}
            setProperty={setProperty}
          />
        </Grid>
      </Flex>
      {/* {hasLayers ? (
        <Flex gap={1} direction="column">
          {boxShadowValue.value.map((layer) => 
            <Layer {...props} key={layer.value} value={layer.value} />;
          )}
        </Flex>
      ) : null} */}
    </BoxShadowWrapper>
  );
};

const BoxShadowWrapper: React.FC<{
  label: string;
  children: ReactNode;
}> = ({ label, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <CollapsibleSectionBase
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle>
          <SectionTitleLabel>Box Shadow</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionBase>
  );
};
