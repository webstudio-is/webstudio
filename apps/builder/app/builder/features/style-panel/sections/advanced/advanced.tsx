import { useEffect, useRef, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  theme,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import {
  hyphenateProperty,
  toValue,
  type CssStyleMap,
} from "@webstudio-is/css-engine";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import {
  createBatchUpdate,
  resetEphemeralStyles,
} from "../../shared/use-style-data";
import { useComputedStyles } from "../../shared/model";
import { getDots } from "../../shared/style-section";
import { $visibleAdvancedStyleDeclarations } from "./stores";
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
import { MixedStyleBlockEditor } from "./mixed-style-block-editor";
import type { ApplyChanges } from "~/builder/shared/css-editor/style-block-parse";
import { $settings, setSetting } from "~/builder/shared/client-settings";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

// Only here to keep the same section module interface
export const properties = [];

const sourceVisibilityOptions = [
  { key: "showCascadedStyles", label: "Show cascaded styles" },
  { key: "showPresetStyles", label: "Show preset styles" },
  { key: "showGlobalVariables", label: "Show global variables" },
] as const;

const AdvancedStyleSection = (props: {
  label: string;
  properties: Array<ComputedStyleDecl["property"]>;
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
      showSeparator={false}
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

export const Section = () => {
  const visibleAdvancedStyleDeclarations = useStore(
    $visibleAdvancedStyleDeclarations
  );
  const readonly = useReadonly();
  const settings = useStore($settings);
  const selectedInstanceKey = useStore($selectedInstanceKey);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const styleSourceSelector = useStore($selectedOrLastStyleSourceSelector);
  const styles = useStore($styles);
  const editorOpenFor = useStore($styleBlockEditorOpenFor);
  const selectionKey = getStyleBlockSelectionKey();
  const previewPropertiesRef = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      if ($styleBlockEditorOpenFor.get()?.selectionKey === selectionKey) {
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
    selectionKey !== undefined && selectionKey === getStyleBlockSelectionKey();

  const handleApplyBlock = ({
    oldStyles,
    initialParsedStyles,
    newStyles,
    mentionedProperties,
    canDelete,
  }: ApplyChanges) => {
    if (!isCurrentSelection()) {
      return;
    }
    const batch = createBatchUpdate();
    const appliedStyles = new Map(oldStyles);
    for (const [property] of oldStyles) {
      if (
        canDelete &&
        !newStyles.has(property) &&
        !mentionedProperties.has(property)
      ) {
        batch.deleteProperty(property);
        appliedStyles.delete(property);
      }
    }
    for (const [property, value] of newStyles) {
      const previous = oldStyles.get(property);
      const initialParsed = initialParsedStyles.get(property);
      if (
        previous === undefined ||
        initialParsed === undefined ||
        toValue(initialParsed) !== toValue(value)
      ) {
        batch.setProperty(property)(value);
        appliedStyles.set(property, value);
      }
    }
    batch.publish({ listed: true });
    return appliedStyles;
  };

  const handlePreviewBlock = (previewStyles?: CssStyleMap) => {
    if (previewStyles === undefined) {
      resetEphemeralStyles();
      previewPropertiesRef.current.clear();
      return;
    }
    if (!isCurrentSelection()) {
      return;
    }
    const savedStyles = new Map(
      blockDeclarations.map(({ property, value }) => [property, value])
    );
    const batch = createBatchUpdate();
    const previewProperties = new Set<string>();
    for (const [property, value] of previewStyles) {
      const saved = savedStyles.get(property);
      if (saved === undefined || toValue(saved) !== toValue(value)) {
        batch.setProperty(property)(value);
        previewProperties.add(property);
      }
    }
    if (previewProperties.size === 0) {
      if (previewPropertiesRef.current.size > 0) {
        resetEphemeralStyles();
      }
      previewPropertiesRef.current = previewProperties;
      return;
    }
    if (
      previewProperties.size !== previewPropertiesRef.current.size ||
      [...previewProperties].some(
        (property) => !previewPropertiesRef.current.has(property)
      )
    ) {
      resetEphemeralStyles();
    }
    previewPropertiesRef.current = previewProperties;
    batch.publish({ isEphemeral: true, listed: true });
  };

  return (
    <>
      <AdvancedStyleSection
        label="Advanced"
        sticky={settings.stickyAdvancedSection}
        properties={blockDeclarations.map(({ property }) => property)}
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
              >
                {sourceVisibilityOptions.map(({ key, label }) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={settings[key]}
                    onCheckedChange={(checked) =>
                      setSetting(key, checked === true)
                    }
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuCheckboxItem
                  checked={settings.stickyAdvancedSection}
                  onCheckedChange={(checked) =>
                    setSetting("stickyAdvancedSection", checked === true)
                  }
                >
                  Pin section
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      >
        {selectedInstanceKey !== undefined && (
          <MixedStyleBlockEditor
            key={selectionKey}
            inline
            declarations={blockDeclarations}
            sourceDeclarations={visibleAdvancedStyleDeclarations}
            readonly={readonly}
            onApply={handleApplyBlock}
            onPreview={handlePreviewBlock}
            onMaximize={openStyleBlockEditor}
            searchStickyTop={theme.spacing[14]}
          />
        )}
      </AdvancedStyleSection>
      {selectedInstanceKey !== undefined && (
        <MixedStyleBlockEditor
          key={selectionKey}
          declarations={blockDeclarations}
          sourceDeclarations={visibleAdvancedStyleDeclarations}
          readonly={readonly}
          onApply={handleApplyBlock}
          onPreview={handlePreviewBlock}
          open={editorOpenFor?.selectionKey === selectionKey}
          onOpenChange={(open) =>
            $styleBlockEditorOpenFor.set(
              open && selectionKey !== undefined ? { selectionKey } : undefined
            )
          }
        />
      )}
    </>
  );
};
