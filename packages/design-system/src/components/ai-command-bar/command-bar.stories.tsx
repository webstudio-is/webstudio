import { CommandBar } from "./command-bar";
import { AutogrowTextArea } from "./autogrow-text-area";
import { Box } from "../box";
import {
  AiIcon,
  // StopIcon,
  MicIcon,
  // LargeXIcon,
  ChevronUpIcon,
} from "@webstudio-is/icons";
import { CommandButton } from "./command-button";

export default {
  title: "Library/AI Command Bar",
};

export const Demo = () => {
  return (
    <Box
      css={{
        position: "fixed",
        bottom: 80,
        left: 0,
        right: 0,
        height: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      <CommandBar>
        <CommandButton color="dark-ghost">
          <ChevronUpIcon />
        </CommandButton>

        <AutogrowTextArea
          css={{ alignSelf: "center" }}
          placeholder="Enter value..."
        />

        <CommandButton color="dark-ghost">
          <MicIcon />
        </CommandButton>
        <CommandButton color="gradient">
          <AiIcon />
        </CommandButton>
      </CommandBar>
    </Box>
  );
};
Demo.storyName = "AI Command Bar";
