import { useState } from "react";
import {
  SectionTitle,
  SectionTitleLabel,
  SectionTitleButton,
} from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import type { RenderCategoryProps } from "../../style-sections";
import { BoxShadowContent } from "./box-shadow-content";

import { CollapsibleSectionBase } from "~/builder/shared/collapsible-section";
import { BoxShadowLayersList } from "./box-shadow-list";
import { getStyleSource } from "../../shared/style-info";
import { PlusIcon } from "@webstudio-is/icons";
import { getDots } from "../../shared/collapsible-section";
import { property } from "./utils";

const label = "Box Shadow";

export const BoxShadows = (props: RenderCategoryProps) => {
  const { currentStyle } = props;
  const value = currentStyle[property]?.value;

  return (
    <BoxShadowWrapper {...props}>
      {value?.type === "layers" && value.value.length > 0 ? (
        <BoxShadowLayersList layers={value} {...props} />
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
                    <BoxShadowContent
                      createBatchUpdate={props.createBatchUpdate}
                    />
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
