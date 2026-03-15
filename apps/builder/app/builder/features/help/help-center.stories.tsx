import { Button, Flex } from "@webstudio-is/design-system";
import { HelpIcon } from "@webstudio-is/icons";
import { HelpCenter as HelpCenterComponent } from "./help-center";

export default {
  title: "Builder/Help/Help center",
  component: HelpCenterComponent,
};

export const HelpCenter = () => (
  <Flex css={{ padding: 100 }}>
    <HelpCenterComponent open>
      <HelpCenterComponent.Trigger asChild>
        <Button prefix={<HelpIcon />} color="ghost">
          Help
        </Button>
      </HelpCenterComponent.Trigger>
    </HelpCenterComponent>
  </Flex>
);
