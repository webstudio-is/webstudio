import { Button, Flex, StorySection } from "@webstudio-is/design-system";
import { HelpIcon } from "@webstudio-is/icons";
import { HelpCenter as HelpCenterComponent } from "./help-center";

export default {
  title: "Builder/Help/Help Center",
  component: HelpCenterComponent,
};

export const HelpCenter = () => (
  <StorySection title="Help Center">
    <Flex css={{ padding: 100 }}>
      <HelpCenterComponent open>
        <HelpCenterComponent.Trigger asChild>
          <Button prefix={<HelpIcon />} color="ghost">
            Help
          </Button>
        </HelpCenterComponent.Trigger>
      </HelpCenterComponent>
    </Flex>
  </StorySection>
);
