import { CommandBar } from "./command-bar";
import { AutogrowTextArea } from "./autogrow-text-area";
import { ScrollArea } from "../scroll-area";
import { Box } from "../box";
import { Grid } from "../grid";
import {
  AiIcon,
  // StopIcon,
  MicIcon,
  // LargeXIcon,
  ChevronUpIcon,
} from "@webstudio-is/icons";
import { CommandButton } from "./command-button";
import { theme } from "../..";

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

        <Grid
          css={{
            alignSelf: "center",
            color: theme.colors.foregroundContrastMain,
            // Set maxWidth to autogrow in width
            width: theme.spacing[31],
          }}
        >
          <ScrollArea css={{ maxHeight: theme.spacing[29] }}>
            <AutogrowTextArea placeholder="Enter value..." />
          </ScrollArea>
        </Grid>

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
