import { useRef, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { PlusIcon } from "@webstudio-is/icons";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import { type CssProperty, type CssStyleMap } from "@webstudio-is/css-engine";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import {
  createBatchUpdate,
  deleteProperty,
  setProperty,
  type DeleteProperty,
} from "../../shared/use-style-data";
import { useComputedStyles } from "../../shared/model";
import { getDots } from "../../shared/style-section";
import { CssEditor, type CssEditorApi } from "../../../../shared/css-editor";
import { $advancedStylesLonghands } from "./stores";
import { $selectedInstanceKey } from "~/shared/awareness";

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
  const selectedInstanceKey = useStore($selectedInstanceKey);
  // Memorizing recent properties by instance id, so that when user switches between instances and comes back
  // they are still in-place
  const [recentPropertiesMap, setRecentPropertiesMap] = useState<
    Map<string, Array<CssProperty>>
  >(new Map());

  const recentProperties = selectedInstanceKey
    ? (recentPropertiesMap.get(selectedInstanceKey) ?? [])
    : [];

  const updateRecentProperties = (properties: Array<CssProperty>) => {
    if (selectedInstanceKey === undefined) {
      return;
    }
    const newRecentPropertiesMap = new Map(recentPropertiesMap);
    newRecentPropertiesMap.set(
      selectedInstanceKey,
      Array.from(new Set(properties))
    );
    setRecentPropertiesMap(newRecentPropertiesMap);
  };

  const handleAddProperties = (styleMap: CssStyleMap) => {
    const batch = createBatchUpdate();
    for (const [property, value] of styleMap) {
      batch.setProperty(property as CssProperty)(value);
    }
    batch.publish({ listed: true });

    const insertedProperties = Array.from(
      styleMap.keys()
    ) as Array<CssProperty>;
    updateRecentProperties([...recentProperties, ...insertedProperties]);
  };

  const handleDeleteProperty: DeleteProperty = (property, options = {}) => {
    deleteProperty(property, options);

    if (options.isEphemeral === true) {
      return;
    }
    updateRecentProperties(
      recentProperties.filter((recentProperty) => recentProperty !== property)
    );
  };

  return (
    <AdvancedStyleSection
      label="Advanced"
      properties={properties}
      onAdd={() => {
        apiRef.current?.showAddStyleInput();
      }}
    >
      <CssEditor
        styleMap={styleMap}
        onDeleteProperty={handleDeleteProperty}
        onSetProperty={setProperty}
        onAddProperties={handleAddProperties}
        apiRef={apiRef}
        recentProperties={recentProperties}
      />
    </AdvancedStyleSection>
  );
};
