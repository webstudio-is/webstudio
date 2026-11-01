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

export const createDeclarationActions = ({
  declarations,
  visibleProperties,
  deletableProperties,
  readonly,
  onPaste,
  onDeleteAllDeclarations,
  canDeleteAllDeclarations,
}: {
  declarations: Array<ComputedStyleDecl>;
  visibleProperties: ReadonlySet<CssProperty>;
  deletableProperties?: ReadonlySet<CssProperty>;
  readonly: boolean;
  onPaste: (cssText: string) => void;
  onDeleteAllDeclarations: (styleMap: CssStyleMap) => void;
  canDeleteAllDeclarations?: boolean;
}) => {
  const isDeletable = (styleDecl: ComputedStyleDecl) =>
    deletableProperties?.has(styleDecl.property) ??
    (styleDecl.source.name === "local" ||
      styleDecl.source.name === "overwritten");
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

  const getAllDeclarations = (deletableOnly = false) => {
    const styleMap: CssStyleMap = new Map();
    for (const styleDecl of declarations) {
      if (
        !visibleProperties.has(styleDecl.property) ||
        (deletableOnly
          ? !isDeletable(styleDecl)
          : toValue(styleDecl.cascadedValue) === "")
      ) {
        continue;
      }
      styleMap.set(styleDecl.property, styleDecl.cascadedValue);
    }
    return styleMap;
  };

  return {
    isDeletable,
    canCopyAll,
    canDeleteAll,
    copyAll: () => {
      const css = generateStyleMap(mergeStyles(getAllDeclarations()));
      navigator.clipboard.writeText(css);
    },
    paste: async () => {
      const text = await readClipboardText();
      if (text !== undefined) {
        onPaste(text);
      }
    },
    deleteAll: () => onDeleteAllDeclarations(getAllDeclarations(true)),
  };
};

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
  const actions = createDeclarationActions({
    declarations,
    visibleProperties,
    deletableProperties,
    readonly,
    onPaste,
    onDeleteAllDeclarations,
    canDeleteAllDeclarations,
  });
  const canDelete =
    !readonly &&
    selectedDeclaration !== undefined &&
    actions.isDeletable(selectedDeclaration);

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
        <ContextMenuItem
          disabled={!actions.canCopyAll}
          onSelect={actions.copyAll}
        >
          Copy all declarations
        </ContextMenuItem>
        <ContextMenuItem disabled={readonly} onSelect={actions.paste}>
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
          disabled={!actions.canDeleteAll}
          onSelect={actions.deleteAll}
        >
          Delete all declarations
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
