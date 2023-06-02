import { useState } from "react";
import type { ReactNode } from "react";

import { type StyleProperty } from "@webstudio-is/css-data";
import type { RenderCategoryProps } from "../../style-sections";
import {
  Flex,
  theme,
  Grid,
  SectionTitle,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { BoxShadowControls } from "./box-shadow-control";
import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";
import { BoxShadowLayersList } from "./box-shadow-list";

const property: StyleProperty = "boxShadow";

export const BoxShadows = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const value = currentStyle[property]?.value;

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
      {value?.type === "layers" && value.value.length > 0 ? (
        <BoxShadowLayersList property={property} layers={value} {...props} />
      ) : null}
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
