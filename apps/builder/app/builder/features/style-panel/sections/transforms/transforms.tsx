import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { useState } from "react";
import {
  CssValueListArrowFocus,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { addDefaultsForTransormSection } from "./utils";
import { Scale } from "./scale";
import { Rotate } from "./rotate";
import { Skew } from "./skew";
import { Translate } from "./translate";

const label = "Transforms";
// @todo: Update with all the properties that are related to this section
export const properties = [
  "translate",
  "scale",
  "transform",
  "backfaceVisibility",
] satisfies Array<StyleProperty>;

export const Section = (props: SectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <CollapsibleSectionRoot
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                addDefaultsForTransormSection({
                  createBatchUpdate: props.createBatchUpdate,
                });
              }}
            />
          }
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      <CssValueListArrowFocus>
        <Translate {...props} index={0} panel="translate" />
        <Scale {...props} index={1} panel="scale" />
        <Rotate {...props} index={2} panel="rotate" />
        <Skew {...props} index={3} panel="skew" />
      </CssValueListArrowFocus>
    </CollapsibleSectionRoot>
  );
};
