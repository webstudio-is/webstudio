import { useRef, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  theme,
} from "@webstudio-is/design-system";
import { generateStyleMap, mergeStyles } from "@webstudio-is/css-engine";
import { useStore } from "@nanostores/react";
import { $advancedStyles } from "./stores";

export const propertyContainerAttribute = "data-property";

export const CopyPasteMenu = ({
  children,
  properties,
  onPaste,
}: {
  children: ReactNode;
  properties: Array<string>;
  onPaste: (cssText: string) => void;
}) => {
  const advancedStyles = useStore($advancedStyles);
  const lastClickedProperty = useRef<string>();

  const handlePaste = () => {
    navigator.clipboard.readText().then(onPaste);
  };

  const handleCopyAll = () => {
    // We want to only copy properties that are currently in front of the user.
    // That includes search or any future filters.
    const currentStyleMap = new Map();
    for (const [property, value] of advancedStyles) {
      if (properties.includes(property)) {
        currentStyleMap.set(property, value);
      }
    }
    const css = generateStyleMap({ style: mergeStyles(currentStyleMap) });
    navigator.clipboard.writeText(css);
  };

  const handleCopy = () => {
    const property = lastClickedProperty.current;
    if (property === undefined) {
      return;
    }
    const value = advancedStyles.get(property);
    if (value === undefined) {
      return;
    }
    const style = new Map([[property, value]]);
    const css = generateStyleMap({ style });
    navigator.clipboard.writeText(css);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onPointerDown={(event) => {
          if (!(event.target instanceof HTMLElement)) {
            return;
          }
          const property = event.target.closest(
            `[${propertyContainerAttribute}]`
          )?.dataset.property;
          lastClickedProperty.current = property;
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent css={{ width: theme.spacing[25] }}>
        <ContextMenuItem onSelect={handleCopyAll}>
          Copy all declarations
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleCopy}>
          Copy declaration
        </ContextMenuItem>
        <ContextMenuItem onSelect={handlePaste}>
          Paste declarations
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
