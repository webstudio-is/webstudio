import { TextField } from "@webstudio-is/design-system";
import { FontsManager } from "~/designer/shared/fonts-manager";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { FloatingPanel } from "~/designer/shared/floating-panel";
import { useState } from "react";
import { toValue } from "@webstudio-is/css-engine";

export const FontFamilyControl = ({
  currentStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    property: styleConfig.property,
  });
  const [isOpen, setIsOpen] = useState(false);

  const setValue = setProperty(styleConfig.property);

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
