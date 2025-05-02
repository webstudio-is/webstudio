import { useState, type ReactNode } from "react";
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
import { CssEditor } from "../../../../shared/css-editor";
import { $advancedStyleDeclarations } from "./stores";
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
  const advancedStyleDeclarations = useStore($advancedStyleDeclarations);
  const properties = advancedStyleDeclarations.map(
    (styleDecl) => styleDecl.property
  );
  const selectedInstanceKey = useStore($selectedInstanceKey);
  // Memorizing recent properties by instance id, so that when user switches between instances and comes back
  // they are still in-place
  const [recentPropertiesMap, setRecentPropertiesMap] = useState<
    Map<string, Array<CssProperty>>
  >(new Map());
  const [showAddStyleInput, setShowAddStyleInput] = useState<boolean>(false);

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

  const handleAddDeclarations = (styleMap: CssStyleMap) => {
    const batch = createBatchUpdate();
    for (const [property, value] of styleMap) {
      batch.setProperty(property)(value);
    }
    batch.publish({ listed: true });

    const insertedProperties = Array.from(styleMap.keys());
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

  const handleDeleteAllDeclarations = (styleMap: CssStyleMap) => {
    const batch = createBatchUpdate();
    for (const [property] of styleMap) {
      batch.deleteProperty(property);
    }
    batch.publish();
    updateRecentProperties(
      recentProperties.filter(
        (recentProperty) => styleMap.has(recentProperty) === false
      )
    );
  };

  return (
    <AdvancedStyleSection
      label="Advanced"
      properties={properties}
      onAdd={() => {
        setShowAddStyleInput(true);
      }}
    >
      <CssEditor
        declarations={advancedStyleDeclarations}
        onDeleteProperty={handleDeleteProperty}
        onSetProperty={setProperty}
        onAddDeclarations={handleAddDeclarations}
        onDeleteAllDeclarations={handleDeleteAllDeclarations}
        recentProperties={recentProperties}
        showAddStyleInput={showAddStyleInput}
        onToggleAddStyleInput={setShowAddStyleInput}
      />
    </AdvancedStyleSection>
  );
};
