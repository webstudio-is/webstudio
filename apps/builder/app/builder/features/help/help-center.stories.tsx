import { Button, Flex } from "@webstudio-is/design-system";
import { QuestionMarkCircleIcon } from "@webstudio-is/icons";
import { HelpCenter } from "./help-center";

export default {
  title: "Builder/Help/Help Center",
  component: HelpCenter,
};

export const HelpCenter = () => (
  <Flex css={{ padding: 100 }}>
    <HelpCenter open>
      <HelpCenter.Trigger asChild>
        <Button prefix={<QuestionMarkCircleIcon />} color="ghost">
          Help
        </Button>
      </HelpCenter.Trigger>
    </HelpCenter>
  </Flex>
);
