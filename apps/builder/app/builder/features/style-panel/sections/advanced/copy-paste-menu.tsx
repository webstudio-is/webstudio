import { type ReactNode } from "react";
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

export const CopyPasteMenu = ({
  children,
  onPaste,
}: {
  children: ReactNode;
  onPaste: (cssText: string) => void;
}) => {
  const advancedStyles = useStore($advancedStyles);

  const handlePaste = () => {
    navigator.clipboard.readText().then(onPaste);
  };

  const handleCopyAll = () => {
    const css = generateStyleMap({ style: mergeStyles(advancedStyles) });
    navigator.clipboard.writeText(css);
    return css;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent css={{ width: theme.spacing[25] }}>
        <ContextMenuItem onSelect={handleCopyAll}>
          Copy all declarations
        </ContextMenuItem>
        <ContextMenuItem>Copy declaration</ContextMenuItem>
        <ContextMenuItem onSelect={handlePaste}>
          Paste declarations
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
