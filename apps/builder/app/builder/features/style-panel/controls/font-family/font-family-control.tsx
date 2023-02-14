import { TextField } from "@webstudio-is/design-system";
import { FontsManager } from "~/builder/shared/fonts-manager";
import type { ControlProps } from "../../style-sections";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { useState } from "react";
import { toValue } from "@webstudio-is/css-engine";

export const FontFamilyControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const value = currentStyle[property]?.value;
  const [isOpen, setIsOpen] = useState(false);

  const setValue = setProperty(property);

  return (
    <FloatingPanel
      title="Fonts"
      content={<FontsManager value={toValue(value)} onChange={setValue} />}
      onOpenChange={setIsOpen}
    >
      <TextField
        defaultValue={toValue(value)}
        state={isOpen ? "active" : undefined}
      />
    </FloatingPanel>
  );
};
