import { useState, type JSX } from "react";
import { Flex, Button, Collapsible } from "@webstudio-is/design-system";
import {
  ChevronFilledDownIcon,
  ChevronFilledRightIcon,
} from "@webstudio-is/icons";

export const ShowMore = ({
  styleConfigs,
}: {
  styleConfigs: Array<JSX.Element | null>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  if (styleConfigs.length === 0) {
    return null;
  }
  return (
    <Collapsible.Root asChild onOpenChange={setIsOpen}>
      <Flex direction="column" gap="3">
        <Collapsible.Trigger asChild>
          <Button
            css={{ width: "100%" }}
            prefix={
              isOpen ? <ChevronFilledDownIcon /> : <ChevronFilledRightIcon />
            }
          >
            Show more
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content asChild>
          <Flex direction="column" gap="3">
            {styleConfigs}
          </Flex>
        </Collapsible.Content>
      </Flex>
    </Collapsible.Root>
  );
};
