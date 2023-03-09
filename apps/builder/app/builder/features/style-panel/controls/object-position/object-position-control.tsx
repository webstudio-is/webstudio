import { Flex, IconButton } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { MenuIcon } from "@webstudio-is/icons";
import { PositionControl } from "../position/position-control";

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
          <PositionControl
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
