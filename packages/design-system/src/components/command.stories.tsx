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
  title: "Command",
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
          actions={[
            { name: "select", label: "Select" },
            { name: "edit", label: "Edit" },
            { name: "delete", label: "Delete" },
          ]}
        >
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labels">Calendar</Text>
            </Flex>
          </CommandItem>
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labels">Search Emoji</Text>
            </Flex>
          </CommandItem>
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labels">Calculator</Text>
            </Flex>
          </CommandItem>
        </CommandGroup>
        <CommandGroup
          heading={<CommandGroupHeading>Settings</CommandGroupHeading>}
          name="settings"
          actions={[{ name: "open", label: "Open" }]}
        >
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labels">Profile</Text>
            </Flex>
            <Kbd value={["meta", "p"]} />
          </CommandItem>
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labels">Billing</Text>
            </Flex>
            <Kbd value={["meta", "b"]} />
          </CommandItem>
          <CommandItem>
            <Flex gap={2}>
              <CommandIcon>
                <InfoCircleIcon />
              </CommandIcon>
              <Text variant="labels">Settings</Text>
            </Flex>
            <Kbd value={["meta", "s"]} />
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
