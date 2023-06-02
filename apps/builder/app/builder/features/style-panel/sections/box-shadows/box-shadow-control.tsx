import {
  Flex,
  IconButton,
  Tooltip,
  theme,
  Label,
} from "@webstudio-is/design-system";
import { PlusIcon, InformationIcon } from "@webstudio-is/icons";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import type { RenderCategoryProps } from "../../style-sections";
import { BoxShadowContent } from "./box-shadow-content";

export const BoxShadowControls = (
  props: Pick<
    RenderCategoryProps,
    "deleteProperty" | "currentStyle" | "setProperty"
  >
) => {
  return (
    <Flex justify="end">
      <FloatingPanel
        title="Box Shadows"
        content={
          <Flex
            direction="column"
            css={{
              gridColumn: "span 2",
              px: theme.spacing[9],
              py: theme.spacing[9],
            }}
          >
            <Label>
              <Flex align={"center"} gap={1}>
                Code
                <Tooltip
                  variant="wrapped"
                  content={<>Paste some informaton here</>}
                >
                  <InformationIcon />
                </Tooltip>
              </Flex>
            </Label>

            <BoxShadowContent {...props} />
          </Flex>
        }
      >
        <IconButton>
          <PlusIcon />
        </IconButton>
      </FloatingPanel>
    </Flex>
  );
};
