import { IconButton } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { FloatingPanel } from "~/builder/shared/floating-panel";
//import { toValue } from "@webstudio-is/css-engine";
import { MenuIcon } from "@webstudio-is/icons";
import { Position } from "../../shared/position";

export const ObjectPositionControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const value = currentStyle.objectPosition?.value;
  // Computed value will result in a unit type
  if (value?.type !== "position" && value?.type !== "unit") {
    return null;
  }

  return (
    <FloatingPanel
      title="Object Position"
      content={<Position value={value} onChange={setProperty(property)} />}
    >
      <IconButton>
        <MenuIcon />
      </IconButton>
    </FloatingPanel>
  );
};
