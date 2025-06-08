import { useRef, type ReactNode } from "react";
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

export const copyAttribute = "data-declaration";

export const CssEditorContextMenu = ({
  children,
  foundProperties,
  declarations,
  onPaste,
  onDeleteProperty,
  onDeleteAllDeclarations,
}: {
  children: ReactNode;
  foundProperties: Array<CssProperty>;
  declarations: Array<ComputedStyleDecl>;
  onPaste: (cssText: string) => void;
  onDeleteProperty: (property: CssProperty) => void;
  onDeleteAllDeclarations: (styleMap: CssStyleMap) => void;
}) => {
  const lastClickedProperty = useRef<string>();

  const handlePaste = () => {
    navigator.clipboard.readText().then(onPaste);
  };

  // Gets all currently visible declarations based on what's in the search or filters.
  const getAllDeclarations = () => {
    // We want to only copy properties that are currently in front of the user.
    // That includes search or any future filters.
    const currentStyleMap: CssStyleMap = new Map();

    for (const styleDecl of declarations) {
      const isEmpty = toValue(styleDecl.cascadedValue) === "";
      if (foundProperties.includes(styleDecl.property) && isEmpty === false) {
        currentStyleMap.set(styleDecl.property, styleDecl.cascadedValue);
      }
    }
    return currentStyleMap;
  };

  const handleCopyAll = () => {
    const styleMap = getAllDeclarations();
    const css = generateStyleMap(mergeStyles(styleMap));
    navigator.clipboard.writeText(css);
  };

  const handleCopy = () => {
    const property = lastClickedProperty.current as CssProperty;

    if (property === undefined) {
      return;
    }
    const styleDecl = declarations.find(
      (styleDecl) => styleDecl.property === property
    );

    if (styleDecl === undefined) {
      return;
    }

    const css = generateStyleMap(
      new Map([[styleDecl.property, styleDecl.cascadedValue]])
    );
    navigator.clipboard.writeText(css);
  };

  const handleDelete = () => {
    const property = lastClickedProperty.current as CssProperty;
    const styleDecl = declarations.find(
      (styleDecl) => styleDecl.property === property
    );
    if (styleDecl === undefined) {
      return;
    }
    onDeleteProperty(property);
  };

  const handleDeleteAllDeclarations = () => {
    const styleMap = getAllDeclarations();
    onDeleteAllDeclarations(styleMap);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onPointerDown={(event) => {
          if (!(event.target instanceof HTMLElement)) {
            return;
          }
          const property =
            event.target
              .closest<HTMLElement>(`[${copyAttribute}]`)
              ?.getAttribute(copyAttribute) ?? undefined;

          lastClickedProperty.current = property;
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent css={{ width: theme.spacing[25] }}>
        <ContextMenuItem onSelect={handleCopy}>
          Copy declaration
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleCopyAll}>
          Copy all declarations
        </ContextMenuItem>
        <ContextMenuItem onSelect={handlePaste}>
          Paste declarations
        </ContextMenuItem>
        <ContextMenuItem destructive onSelect={handleDelete}>
          Delete declaration
        </ContextMenuItem>
        <ContextMenuItem destructive onSelect={handleDeleteAllDeclarations}>
          Delete all declarations
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
