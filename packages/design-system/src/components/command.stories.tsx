import type { Meta, StoryFn } from "@storybook/react";
import {
  Command as CommandComponent,
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

const meta: Meta = {
  title: "Library/Command",
};
export default meta;

export const Command: StoryFn = () => {
  return (
    <CommandComponent>
      <CommandInput />
      <CommandList>
        <CommandGroup
          heading={<CommandGroupHeading>Suggestions</CommandGroupHeading>}
        >
          <CommandItem>
            <CommandIcon>
              <InfoCircleIcon />
            </CommandIcon>
            <Text variant="labelsTitleCase">Calendar</Text>
          </CommandItem>
          <CommandItem>
            <CommandIcon>
              <InfoCircleIcon />
            </CommandIcon>
            <Text variant="labelsTitleCase">Search Emoji</Text>
          </CommandItem>
          <CommandItem>
            <CommandIcon>
              <InfoCircleIcon />
            </CommandIcon>
            <Text variant="labelsTitleCase">Calculator</Text>
          </CommandItem>
        </CommandGroup>
        <CommandGroup
          heading={<CommandGroupHeading>Settings</CommandGroupHeading>}
        >
          <CommandItem>
            <CommandIcon>
              <InfoCircleIcon />
            </CommandIcon>
            <Text variant="labelsTitleCase">Profile</Text>
            <Kbd value={["cmd", "p"]} />
          </CommandItem>
          <CommandItem>
            <CommandIcon>
              <InfoCircleIcon />
            </CommandIcon>
            <Text variant="labelsTitleCase">Billing</Text>
            <Kbd value={["cmd", "b"]} />
          </CommandItem>
          <CommandItem>
            <CommandIcon>
              <InfoCircleIcon />
            </CommandIcon>
            <Text variant="labelsTitleCase">Settings</Text>
            <Kbd value={["cmd", "s"]} />
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandComponent>
  );
};
