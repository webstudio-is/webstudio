import { Flex, IconButton, theme } from "@webstudio-is/design-system";
import type { ControlProps } from "../types";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { EllipsesIcon } from "@webstudio-is/icons";
import { PositionControl } from "../position/position-control";

export const ObjectPositionControl = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
  isAdvanced,
}: ControlProps) => {
  return (
    <Flex justify="end">
      <FloatingPanel
        title="Object Position"
        content={
          <Flex css={{ px: theme.spacing[9], py: theme.spacing[5] }}>
            <PositionControl
              property={property}
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
              isAdvanced={isAdvanced}
            />
          </Flex>
        }
      >
        <IconButton>
          <EllipsesIcon />
        </IconButton>
      </FloatingPanel>
    </Flex>
  );
};
