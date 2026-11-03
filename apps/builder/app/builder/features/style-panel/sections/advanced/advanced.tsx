import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRightSlot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Kbd,
  PanelContent,
  SearchField,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  theme,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
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
import { insertStyleDeclarations } from "../../../../shared/css-editor/css-editor";
import { createDeclarationActions } from "../../../../shared/css-editor/css-editor-context-menu";
import { getMatchingProperties } from "../../../../shared/css-editor/property-search";
import {
  $advancedStyleDeclarations,
  $visibleAdvancedStyleDeclarations,
  getAdvancedStyleSource,
} from "./stores";
import {
  $styleBlockEditorOpenFor,
  getStyleBlockSelectionKey,
  openStyleBlockEditor,
} from "./style-block-editor-state";
import {
  $selectedBreakpoint,
  $selectedInstanceKey,
  $selectedOrLastStyleSourceSelector,
} from "~/shared/nano-states";
import { $styles } from "~/shared/sync/data-stores";
import { useReadonly } from "../../shared/readonly";
import { InlineStyleBlockEditor, StyleBlockDialog } from "./style-block-dialog";
import { InheritedStylesPreview } from "./inherited-styles-preview";
import { $settings, setSetting } from "~/builder/shared/client-settings";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

// Only here to keep the same section module interface
export const properties = [];

const AdvancedStyleSection = (props: {
  label: string;
  properties: Array<CssProperty>;
  children: ReactNode;
  suffix?: ReactNode;
  suffixPlaceholder?: ReactNode;
  sticky?: boolean;
}) => {
  const { label, children, properties, suffix, suffixPlaceholder, sticky } =
    props;
  const [isOpen, setIsOpen] = useOpenState(label);
  const styles = useComputedStyles(properties);
  return (
    <CollapsibleSectionRoot
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      fullWidth
      sticky={sticky}
      trigger={
        <SectionTitle
          dots={getDots(styles)}
          suffix={suffix}
          suffixPlaceholder={suffixPlaceholder}
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionRoot>
  );
};

const CodeView = ({
  declarations,
  blockDeclarations,
  readonly,
  onApply,
}: {
  declarations: ComputedStyleDecl[];
  blockDeclarations: ComponentProps<
    typeof InlineStyleBlockEditor
  >["declarations"];
  readonly: boolean;
  onApply: ComponentProps<typeof InlineStyleBlockEditor>["onApply"];
}) => {
  const [searchTerm, setSearchTerm] = useState<string>();
  const visibleDeclarations = useMemo(() => {
    const inheritedDeclarations = declarations.filter(
      (declaration) => getAdvancedStyleSource(declaration) !== undefined
    );
    const matches = getMatchingProperties(inheritedDeclarations, searchTerm);
    if (matches === undefined) {
      return inheritedDeclarations;
    }
    const matchedProperties = new Set(matches);
    return inheritedDeclarations.filter((declaration) =>
      matchedProperties.has(declaration.property)
    );
  }, [declarations, searchTerm]);

  return (
    <>
      <InlineStyleBlockEditor
        declarations={blockDeclarations}
        readonly={readonly}
        onApply={onApply}
      />
      <PanelContent>
        <SearchField
          onChange={(event) => {
            const search = event.target.value.trim().replaceAll("-", " ");
            setSearchTerm(search || undefined);
          }}
          onAbort={() => setSearchTerm(undefined)}
        />
      </PanelContent>
      <InheritedStylesPreview declarations={visibleDeclarations} />
    </>
  );
};

export const Section = () => {
  const advancedStyleDeclarations = useStore($advancedStyleDeclarations);
  const visibleAdvancedStyleDeclarations = useStore(
    $visibleAdvancedStyleDeclarations
  );
  const computedStyleDeclarations = useStore($computedStyleDeclarations);
  const readonly = useReadonly();
  const {
    codeEditingMode,
    stickyAdvancedSection,
    showCascadedStyles,
    showPresetStyles,
    showGlobalVariables,
  } = useStore($settings);
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
  const editorOpenFor = useStore($styleBlockEditorOpenFor);
  const selectionKey = getStyleBlockSelectionKey();

  useEffect(() => {
    return () => {
      if ($styleBlockEditorOpenFor.get() === selectionKey) {
        $styleBlockEditorOpenFor.set(undefined);
      }
    };
  }, [selectionKey]);

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
    $selectedInstanceKey.get() === selectedInstanceKey &&
    $selectedBreakpoint.get()?.id === selectedBreakpoint?.id &&
    $selectedOrLastStyleSourceSelector.get()?.styleSourceId ===
      styleSourceSelector?.styleSourceId &&
    $selectedOrLastStyleSourceSelector.get()?.state ===
      styleSourceSelector?.state;

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
    if (!isCurrentSelection()) {
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

  const menuDeclarations = codeEditingMode
    ? blockDeclarations.map(
        ({ property, value }) =>
          ({
            property,
            source: { name: "local" },
            cascadedValue: value,
            computedValue: value,
            usedValue: value,
          }) satisfies ComputedStyleDecl
      )
    : advancedStyleDeclarations;
  const actions = createDeclarationActions({
    declarations: menuDeclarations,
    visibleProperties: new Set(
      menuDeclarations.map(({ property }) => property)
    ),
    deletableProperties: codeEditingMode
      ? new Set(blockDeclarations.map(({ property }) => property))
      : deletableProperties,
    readonly,
    onPaste: (cssText) => {
      if (!readonly) {
        insertStyleDeclarations(cssText, handleAddDeclarations);
      }
    },
    onDeleteAllDeclarations: handleDeleteAllDeclarations,
  });

  return (
    <>
      <AdvancedStyleSection
        label="Advanced"
        sticky={stickyAdvancedSection}
        properties={
          codeEditingMode
            ? blockDeclarations.map(({ property }) => property)
            : properties
        }
        suffixPlaceholder={<SectionTitleButton prefix={<EllipsesIcon />} />}
        suffix={
          selectedInstanceKey !== undefined && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SectionTitleButton
                  aria-label="Advanced"
                  prefix={<EllipsesIcon />}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                collisionPadding={16}
                css={{ width: theme.spacing[28] }}
                onCloseAutoFocus={(event) => {
                  if ($styleBlockEditorOpenFor.get() === selectionKey) {
                    event.preventDefault();
                  }
                }}
              >
                <DropdownMenuItem
                  withIndicator
                  disabled={readonly}
                  onSelect={openStyleBlockEditor}
                >
                  Open code editor
                  <DropdownMenuItemRightSlot>
                    <Kbd value={["alt", "shift", "x"]} />
                  </DropdownMenuItemRightSlot>
                </DropdownMenuItem>
                <DropdownMenuCheckboxItem
                  checked={codeEditingMode}
                  onCheckedChange={(checked) =>
                    setSetting("codeEditingMode", checked === true)
                  }
                >
                  Code view
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showCascadedStyles}
                  onCheckedChange={(checked) =>
                    setSetting("showCascadedStyles", checked === true)
                  }
                >
                  Show cascaded styles
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showPresetStyles}
                  onCheckedChange={(checked) =>
                    setSetting("showPresetStyles", checked === true)
                  }
                >
                  Show preset styles
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showGlobalVariables}
                  onCheckedChange={(checked) =>
                    setSetting("showGlobalVariables", checked === true)
                  }
                >
                  Show global variables
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={stickyAdvancedSection}
                  onCheckedChange={(checked) =>
                    setSetting("stickyAdvancedSection", checked === true)
                  }
                >
                  Pin section
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  withIndicator
                  disabled={!actions.canCopyAll}
                  onSelect={actions.copyAll}
                >
                  Copy declarations
                </DropdownMenuItem>
                <DropdownMenuItem
                  withIndicator
                  disabled={readonly}
                  onSelect={actions.paste}
                >
                  Paste declarations
                </DropdownMenuItem>
                <DropdownMenuItem
                  withIndicator
                  destructive
                  disabled={!actions.canDeleteAll}
                  onSelect={actions.deleteAll}
                >
                  Delete declarations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      >
        {codeEditingMode ? (
          selectedInstanceKey !== undefined && (
            <CodeView
              key={selectionKey}
              declarations={visibleAdvancedStyleDeclarations}
              blockDeclarations={blockDeclarations}
              readonly={readonly}
              onApply={handleApplyBlock}
            />
          )
        ) : (
          <CssEditor
            key={selectionKey}
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
          />
        )}
      </AdvancedStyleSection>
      {selectedInstanceKey !== undefined && (
        <StyleBlockDialog
          key={selectionKey}
          declarations={blockDeclarations}
          readonly={readonly}
          onApply={handleApplyBlock}
          open={editorOpenFor === selectionKey}
          onOpenChange={(open) =>
            $styleBlockEditorOpenFor.set(open ? selectionKey : undefined)
          }
        />
      )}
    </>
  );
};
