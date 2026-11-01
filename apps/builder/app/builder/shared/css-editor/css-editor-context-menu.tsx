import { useState, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  theme,
} from "@webstudio-is/design-system";
import {
  generateStyleMap,
  mergeStyles,
  toValue,
  type CssProperty,
  type CssStyleMap,
} from "@webstudio-is/css-engine";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { readClipboardText } from "~/shared/clipboard";

export const copyAttribute = "data-declaration";

export const CssEditorContextMenu = ({
  children,
  foundProperties,
  declarations,
  onPaste,
  onDeleteProperty,
  onDeleteAllDeclarations,
  readonly = false,
  deletableProperties,
  canDeleteAllDeclarations,
}: {
  children: ReactNode;
  foundProperties: Array<CssProperty>;
  declarations: Array<ComputedStyleDecl>;
  onPaste: (cssText: string) => void;
  onDeleteProperty: (property: CssProperty) => void;
  onDeleteAllDeclarations: (styleMap: CssStyleMap) => void;
  readonly?: boolean;
  deletableProperties?: ReadonlySet<CssProperty>;
  canDeleteAllDeclarations?: boolean;
}) => {
  const [clickedProperty, setClickedProperty] = useState<string>();
  const selectedDeclaration = declarations.find(
    ({ property }) => property === clickedProperty
  );
  const visibleProperties = new Set(foundProperties);
  const isDeletable = (styleDecl: ComputedStyleDecl) =>
    deletableProperties?.has(styleDecl.property) ??
    (styleDecl.source.name === "local" ||
      styleDecl.source.name === "overwritten");
  const canDelete =
    !readonly &&
    selectedDeclaration !== undefined &&
    isDeletable(selectedDeclaration);
  const canCopyAll = declarations.some(
    ({ property, cascadedValue }) =>
      visibleProperties.has(property) && toValue(cascadedValue) !== ""
  );
  const canDeleteAll =
    !readonly &&
    (canDeleteAllDeclarations ??
      declarations.some(
        (styleDecl) =>
          visibleProperties.has(styleDecl.property) && isDeletable(styleDecl)
      ));

  const handlePaste = async () => {
    const text = await readClipboardText();
    if (text !== undefined) {
      onPaste(text);
    }
  };

  // Gets all currently visible declarations based on what's in the search or filters.
  const getAllDeclarations = (deletableOnly = false) => {
    // We want to only copy properties that are currently in front of the user.
    // That includes search or any future filters.
    const currentStyleMap: CssStyleMap = new Map();

    for (const styleDecl of declarations) {
      if (!visibleProperties.has(styleDecl.property)) {
        continue;
      }
      if (
        deletableOnly
          ? !isDeletable(styleDecl)
          : toValue(styleDecl.cascadedValue) === ""
      ) {
        continue;
      }
      currentStyleMap.set(styleDecl.property, styleDecl.cascadedValue);
    }
    return currentStyleMap;
  };

  const handleCopyAll = () => {
    const styleMap = getAllDeclarations();
    const css = generateStyleMap(mergeStyles(styleMap));
    navigator.clipboard.writeText(css);
  };

  const handleCopy = () => {
    if (selectedDeclaration === undefined) {
      return;
    }

    const css = generateStyleMap(
      new Map([
        [selectedDeclaration.property, selectedDeclaration.cascadedValue],
      ])
    );
    navigator.clipboard.writeText(css);
  };

  const handleDelete = () => {
    if (!canDelete || selectedDeclaration === undefined) {
      return;
    }
    onDeleteProperty(selectedDeclaration.property);
  };

  const handleDeleteAllDeclarations = () => {
    const styleMap = getAllDeclarations(true);
    onDeleteAllDeclarations(styleMap);
  };

  const updateClickedProperty = (target: EventTarget) => {
    setClickedProperty(
      target instanceof Element
        ? (target
            .closest<HTMLElement>(`[${copyAttribute}]`)
            ?.getAttribute(copyAttribute) ?? undefined)
        : undefined
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onPointerDown={(event) => updateClickedProperty(event.target)}
        onContextMenu={(event) => updateClickedProperty(event.target)}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent css={{ width: theme.spacing[25] }}>
        <ContextMenuItem
          disabled={selectedDeclaration === undefined}
          onSelect={handleCopy}
        >
          Copy declaration
        </ContextMenuItem>
        <ContextMenuItem disabled={!canCopyAll} onSelect={handleCopyAll}>
          Copy all declarations
        </ContextMenuItem>
        <ContextMenuItem disabled={readonly} onSelect={handlePaste}>
          Paste declarations
        </ContextMenuItem>
        <ContextMenuItem
          destructive
          disabled={!canDelete}
          onSelect={handleDelete}
        >
          Delete declaration
        </ContextMenuItem>
        <ContextMenuItem
          destructive
          disabled={!canDeleteAll}
          onSelect={handleDeleteAllDeclarations}
        >
          Delete all declarations
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
