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

export const copyAttribute = "data-declaration";

export const CssEditorContextMenu = ({
  children,
  properties,
  styleMap,
  onPaste,
  onDeleteProperty,
}: {
  children: ReactNode;
  properties: Array<string>;
  styleMap: CssStyleMap;
  onPaste: (cssText: string) => void;
  onDeleteProperty: (property: CssProperty) => void;
}) => {
  const lastClickedProperty = useRef<string>();

  const handlePaste = () => {
    navigator.clipboard.readText().then(onPaste);
  };

  const handleCopyAll = () => {
    // We want to only copy properties that are currently in front of the user.
    // That includes search or any future filters.
    const currentStyleMap: CssStyleMap = new Map();
    for (const [property, value] of styleMap) {
      const isEmpty = toValue(value) === "";
      if (properties.includes(property) && isEmpty === false) {
        currentStyleMap.set(property, value);
      }
    }

    const css = generateStyleMap(mergeStyles(currentStyleMap));
    navigator.clipboard.writeText(css);
  };

  const handleCopy = () => {
    const property = lastClickedProperty.current as CssProperty;

    if (property === undefined) {
      return;
    }
    const value = styleMap.get(property);

    if (value === undefined) {
      return;
    }

    const css = generateStyleMap(new Map([[property, value]]));
    navigator.clipboard.writeText(css);
  };

  const handleDelete = () => {
    const property = lastClickedProperty.current as CssProperty;
    const value = styleMap.get(property);
    if (value === undefined) {
      return;
    }
    onDeleteProperty(property);
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
      </ContextMenuContent>
    </ContextMenu>
  );
};
