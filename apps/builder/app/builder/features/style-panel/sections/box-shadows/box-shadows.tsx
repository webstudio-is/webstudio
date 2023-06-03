import { useState } from "react";
import { type StyleProperty } from "@webstudio-is/css-data";
import {
  Tooltip,
  Flex,
  theme,
  Grid,
  SectionTitle,
  SectionTitleLabel,
  SectionTitleButton,
  Label,
} from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { InformationIcon } from "@webstudio-is/icons";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import type { RenderCategoryProps } from "../../style-sections";
import { BoxShadowContent } from "./box-shadow-content";

import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";
import { BoxShadowLayersList } from "./box-shadow-list";
import { getStyleSource } from "../../shared/style-info";
import { PlusIcon } from "@webstudio-is/icons";
import { getDots } from "../../shared/collapsible-section";

const property: StyleProperty = "boxShadow";
const label = "Box Shadow";

export const BoxShadows = (props: RenderCategoryProps) => {
  const { currentStyle } = props;
  const value = currentStyle[property]?.value;

  return (
    <BoxShadowWrapper {...props}>
      {value?.type === "layers" && value.value.length > 0 ? (
        <BoxShadowLayersList property={property} layers={value} {...props} />
      ) : (
        <></>
      )}
    </BoxShadowWrapper>
  );
};

const BoxShadowWrapper: React.FC<
  RenderCategoryProps & {
    children: JSX.Element;
  }
> = (props) => {
  const { children, currentStyle, deleteProperty } = props;
  const [isSectionOpen, setSectionStatus] = useState(true);
  const layersStyleSource = getStyleSource(currentStyle[property]);

  return (
    <CollapsibleSectionBase
      fullWidth
      label={label}
      isOpen={isSectionOpen}
      onOpenChange={setSectionStatus}
      trigger={
        <SectionTitle
          dots={getDots(currentStyle, [property])}
          suffix={
            <SectionTitleButton
              prefix={
                <FloatingPanel
                  title={label}
                  content={
                    <Flex
                      direction="column"
                      css={{
                        px: theme.spacing[9],
                        py: theme.spacing[9],
                      }}
                    >
                      <Label>
                        <Flex align={"center"} gap={1}>
                          Code
                          <Tooltip
                            variant="wrapped"
                            content={
                              <>
                                Paste a box-shadow, for example:
                                <br />
                                <br />
                                box-shadow(...)
                              </>
                            }
                          >
                            <InformationIcon />
                          </Tooltip>
                        </Flex>
                      </Label>
                      <BoxShadowContent {...props} />
                    </Flex>
                  }
                >
                  <PlusIcon />
                </FloatingPanel>
              }
            />
          }
        >
          <PropertyName
            style={currentStyle}
            property={property}
            label={
              <SectionTitleLabel color={layersStyleSource}>
                {label}
              </SectionTitleLabel>
            }
            onReset={() => deleteProperty(property)}
          />
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionBase>
  );
};
