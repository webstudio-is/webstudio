import { useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { SectionTitle, SectionTitleLabel } from "@webstudio-is/design-system";
import {
  type CssProperty,
  type CssStyleMap,
  type StyleValue,
  hyphenateProperty,
  toValue,
} from "@webstudio-is/css-engine";
import { camelCaseProperty } from "@webstudio-is/css-data";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import {
  createBatchUpdate,
  deleteProperty,
  setProperty,
  type DeleteProperty,
  type SetProperty,
} from "../../shared/use-style-data";
import {
  $computedStyleDeclarations,
  useComputedStyles,
} from "../../shared/model";
import { getDots } from "../../shared/style-section";
import { CssEditor } from "../../../../shared/css-editor";
import { $advancedStyleDeclarations } from "./stores";
import {
  $selectedBreakpoint,
  $selectedInstanceKey,
  $selectedOrLastStyleSourceSelector,
} from "~/shared/nano-states";
import { $styles } from "~/shared/sync/data-stores";
import { useReadonly } from "../../shared/readonly";
import { AdvancedCssDialog } from "./advanced-css-dialog";

// Only here to keep the same section module interface
export const properties = [];

const AdvancedStyleSection = (props: {
  label: string;
  properties: Array<CssProperty>;
  children: ReactNode;
  suffix?: ReactNode;
}) => {
  const { label, children, properties, suffix } = props;
  const [isOpen, setIsOpen] = useOpenState(label);
  const styles = useComputedStyles(properties);
  return (
    <CollapsibleSectionRoot
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      fullWidth
      trigger={
        <SectionTitle dots={getDots(styles)} suffix={suffix}>
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
  const computedStyleDeclarations = useStore($computedStyleDeclarations);
  const readonly = useReadonly();
  const properties = advancedStyleDeclarations.map(
    (styleDecl) => styleDecl.property
  );
  const selectedInstanceKey = useStore($selectedInstanceKey);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const styleSourceSelector = useStore($selectedOrLastStyleSourceSelector);
  const styles = useStore($styles);
  const deletableProperties = new Set<CssProperty>();
  if (selectedBreakpoint !== undefined && styleSourceSelector !== undefined) {
    for (const { property } of advancedStyleDeclarations) {
      if (
        styles.has(
          getStyleDeclKey({
            styleSourceId: styleSourceSelector.styleSourceId,
            breakpointId: selectedBreakpoint.id,
            state: styleSourceSelector.state,
            property: camelCaseProperty(property),
          })
        )
      ) {
        deletableProperties.add(property);
      }
    }
  }
  // Memorizing recent properties by instance id, so that when user switches between instances and comes back
  // they are still in-place
  const [recentPropertiesMap, setRecentPropertiesMap] = useState<
    Map<string, Array<CssProperty>>
  >(new Map());
  const [addStyleInputFor, setAddStyleInputFor] = useState<string>();

  const blockDeclarations =
    selectedBreakpoint === undefined || styleSourceSelector === undefined
      ? []
      : Array.from(styles.values())
          .filter(
            (declaration) =>
              declaration.styleSourceId === styleSourceSelector.styleSourceId &&
              declaration.breakpointId === selectedBreakpoint.id &&
              declaration.state === styleSourceSelector.state
          )
          .map(({ property, value }) => ({
            property: hyphenateProperty(property),
            value,
          }));

  const isCurrentSelection = () =>
    selectedInstanceKey !== undefined &&
    $selectedInstanceKey.get() === selectedInstanceKey;

  const recentProperties = selectedInstanceKey
    ? (recentPropertiesMap.get(selectedInstanceKey) ?? [])
    : [];

  const updateRecentProperties = (properties: Array<CssProperty>) => {
    if (selectedInstanceKey === undefined || !isCurrentSelection()) {
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
    if (!isCurrentSelection()) {
      return;
    }
    const batch = createBatchUpdate();
    for (const [property, value] of styleMap) {
      batch.setProperty(property)(value);
    }
    batch.publish({ listed: true });

    const insertedProperties = Array.from(styleMap.keys());
    updateRecentProperties([...recentProperties, ...insertedProperties]);
  };

  const handleDeleteProperty: DeleteProperty = (property, options = {}) => {
    if (!isCurrentSelection()) {
      return;
    }
    deleteProperty(property, options);

    if (options.isEphemeral === true) {
      return;
    }
    updateRecentProperties(
      recentProperties.filter((recentProperty) => recentProperty !== property)
    );
  };

  const handleRenameProperty = (
    oldProperty: CssProperty,
    newProperty: CssProperty,
    value: StyleValue
  ) => {
    if (!isCurrentSelection()) {
      return;
    }
    const batch = createBatchUpdate();
    batch.setProperty(newProperty)(value);
    batch.deleteProperty(oldProperty);
    batch.publish({ listed: true });
    updateRecentProperties(
      recentProperties.map((property) =>
        property === oldProperty ? newProperty : property
      )
    );
  };

  const handleDeleteAllDeclarations = (styleMap: CssStyleMap) => {
    if (!isCurrentSelection()) {
      return;
    }
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

  const handleSetProperty: SetProperty = (property) => (value, options) => {
    if (isCurrentSelection()) {
      setProperty(property)(value, options);
    }
  };

  const handleApplyBlock = ({
    oldStyles,
    initialParsedStyles,
    protectedProperties,
    newStyles,
    mentionedProperties,
    canDelete,
  }: {
    oldStyles: CssStyleMap;
    initialParsedStyles: CssStyleMap;
    protectedProperties: ReadonlySet<CssProperty>;
    newStyles: CssStyleMap;
    mentionedProperties: ReadonlySet<CssProperty>;
    canDelete: boolean;
  }) => {
    if (
      !isCurrentSelection() ||
      $selectedBreakpoint.get()?.id !== selectedBreakpoint?.id ||
      $selectedOrLastStyleSourceSelector.get()?.styleSourceId !==
        styleSourceSelector?.styleSourceId ||
      $selectedOrLastStyleSourceSelector.get()?.state !==
        styleSourceSelector?.state
    ) {
      return;
    }
    const batch = createBatchUpdate();
    for (const [property] of oldStyles) {
      if (
        canDelete &&
        !newStyles.has(property) &&
        !mentionedProperties.has(property)
      ) {
        batch.deleteProperty(property);
      }
    }
    for (const [property, value] of newStyles) {
      const previous = oldStyles.get(property);
      const initialParsed = initialParsedStyles.get(property);
      if (protectedProperties.has(property)) {
        continue;
      }
      if (
        previous === undefined ||
        initialParsed === undefined ||
        toValue(initialParsed) !== toValue(value)
      ) {
        batch.setProperty(property)(value);
      }
    }
    batch.publish({ listed: true });
    updateRecentProperties([
      ...recentProperties.filter(
        (property) =>
          newStyles.has(property) ||
          mentionedProperties.has(property) ||
          !canDelete
      ),
      ...Array.from(newStyles.keys()).filter(
        (property) => !oldStyles.has(property)
      ),
    ]);
  };

  return (
    <AdvancedStyleSection
      label="Advanced"
      properties={properties}
      suffix={
        selectedInstanceKey !== undefined && (
          <AdvancedCssDialog
            key={`${selectedInstanceKey}:${selectedBreakpoint?.id}:${styleSourceSelector?.styleSourceId}:${styleSourceSelector?.state}`}
            declarations={blockDeclarations}
            readonly={readonly}
            onApply={handleApplyBlock}
          />
        )
      }
    >
      <CssEditor
        key={selectedInstanceKey}
        readonly={readonly}
        showInlineAddButton={selectedInstanceKey !== undefined}
        declarations={advancedStyleDeclarations}
        existingDeclarations={computedStyleDeclarations}
        deletableProperties={deletableProperties}
        onDeleteProperty={handleDeleteProperty}
        onSetProperty={handleSetProperty}
        onRenameProperty={handleRenameProperty}
        onAddDeclarations={handleAddDeclarations}
        onDeleteAllDeclarations={handleDeleteAllDeclarations}
        recentProperties={recentProperties}
        showAddStyleInput={
          selectedInstanceKey !== undefined &&
          addStyleInputFor === selectedInstanceKey
        }
        onToggleAddStyleInput={(show) => {
          if (isCurrentSelection()) {
            setAddStyleInputFor(show ? selectedInstanceKey : undefined);
          }
        }}
      />
    </AdvancedStyleSection>
  );
};
