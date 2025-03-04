import { useRef, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { PlusIcon } from "@webstudio-is/icons";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { camelCaseProperty } from "@webstudio-is/css-data";
import { type CssProperty, type StyleMap } from "@webstudio-is/css-engine";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import {
  createBatchUpdate,
  deleteProperty,
  setProperty,
} from "../../shared/use-style-data";
import { useComputedStyles } from "../../shared/model";
import { getDots } from "../../shared/style-section";
import { CssEditor, type CssEditorApi } from "../../shared/css-editor";
import { $advancedStylesLonghands } from "./stores";

// Only here to keep the same section module interface
export const properties = [];

const AdvancedStyleSection = (props: {
  label: string;
  properties: Array<CssProperty>;
  onAdd: () => void;
  children: ReactNode;
}) => {
  const { label, children, properties, onAdd } = props;
  const [isOpen, setIsOpen] = useOpenState(label);
  const styles = useComputedStyles(properties);
  return (
    <CollapsibleSectionRoot
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      fullWidth
      trigger={
        <SectionTitle
          dots={getDots(styles)}
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                setIsOpen(true);
                onAdd();
              }}
            />
          }
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionRoot>
  );
};

export const Section = () => {
  const styleMap = useStore($advancedStylesLonghands);
  const apiRef = useRef<CssEditorApi>();
  const properties = Array.from(styleMap.keys()) as Array<CssProperty>;

  const handleShowAddStyleInput = () => {
    apiRef.current?.showAddStyleInput();
  };

  const insertProperties = (styleMap: StyleMap) => {
    const batch = createBatchUpdate();
    for (const [property, value] of styleMap) {
      batch.setProperty(camelCaseProperty(property as CssProperty))(value);
    }
    batch.publish({ listed: true });
  };

  return (
    <AdvancedStyleSection
      label="Advanced"
      properties={properties}
      onAdd={handleShowAddStyleInput}
    >
      <CssEditor
        styleMap={styleMap}
        deleteProperty={deleteProperty}
        setProperty={setProperty}
        insertProperties={insertProperties}
        apiRef={apiRef}
      />
    </AdvancedStyleSection>
  );
};
