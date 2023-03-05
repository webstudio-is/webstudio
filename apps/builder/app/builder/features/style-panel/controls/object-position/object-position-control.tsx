import { Flex, IconButton } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { MenuIcon } from "@webstudio-is/icons";
import { Position } from "../position/position";

export const ObjectPositionControl = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
}: ControlProps) => {
  return (
    <Flex justify="end">
      <FloatingPanel
        title="Object Position"
        content={
          <Position
            property={property}
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        }
      >
        <IconButton>
          <MenuIcon />
        </IconButton>
      </FloatingPanel>
    </Flex>
  );
};
