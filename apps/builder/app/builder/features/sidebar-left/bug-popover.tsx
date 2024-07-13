import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  rawTheme,
  theme,
  Text,
} from "@webstudio-is/design-system";

import { type ComponentProps } from "react";

export const BugPopOver = ({
  children,
  side = "right",
  ...popoverProps
}: {
  children: React.ReactNode;
  side?: "bottom" | "left" | "right" | "top";
} & Pick<ComponentProps<typeof Popover>, "open" | "onOpenChange">) => {
  return (
    <Popover {...popoverProps}>
      {children}
      <PopoverPortal>
        <PopoverContent
          avoidCollisions
          sideOffset={0}
          // Height of the footer
          collisionPadding={{ bottom: Number.parseFloat(rawTheme.spacing[11]) }}
          side={side}
        >
          <Flex
            as="form"
            target="_blank"
            direction="column"
            css={{ px: theme.spacing[7], py: theme.spacing[3] }}
            gap="2"
          >
            <Button
              formAction="https://github.com/webstudio-is/webstudio-community/discussions/new?category=q-a&labels=bug&title=[Bug]"
              color="dark"
            >
              Contact Us
            </Button>
            <Text variant={"small"}>
              For account issues or builder bugs only
            </Text>
          </Flex>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

BugPopOver.Trigger = PopoverTrigger;
