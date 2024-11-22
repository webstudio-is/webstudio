import type { Meta, StoryFn } from "@storybook/react";
import {
  Command as CommandComponent,
  CommandFooter,
  CommandGroup,
  CommandGroupHeading,
  CommandIcon,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Text } from "./text";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { Kbd } from "./kbd";
import { Flex } from "./flex";
import { Separator } from "./separator";

const meta: Meta = {
  title: "Library/Command",
};
export default meta;

const CommandContent = () => {
  return (
    <>
      <CommandInput />
      <CommandList>
        <CommandGroup
          heading={<CommandGroupHeading>Suggestions</CommandGroupHeading>}
          name="suggestions"
          actions={["select", "edit", "delete"]}
        >
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labelsTitleCase">Calendar</Text>
            </Flex>
          </CommandItem>
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labelsTitleCase">Search Emoji</Text>
            </Flex>
          </CommandItem>
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labelsTitleCase">Calculator</Text>
            </Flex>
          </CommandItem>
        </CommandGroup>
        <CommandGroup
          heading={<CommandGroupHeading>Settings</CommandGroupHeading>}
          name="settings"
          actions={["open"]}
        >
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labelsTitleCase">Profile</Text>
            </Flex>
            <Kbd value={["cmd", "p"]} />
          </CommandItem>
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labelsTitleCase">Billing</Text>
            </Flex>
            <Kbd value={["cmd", "b"]} />
          </CommandItem>
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labelsTitleCase">Settings</Text>
            </Flex>
            <Kbd value={["cmd", "s"]} />
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <Separator />
      <CommandFooter />
    </>
  );
};

export const Command: StoryFn = () => {
  return (
    <CommandComponent>
      <CommandContent />
    </CommandComponent>
  );
};
