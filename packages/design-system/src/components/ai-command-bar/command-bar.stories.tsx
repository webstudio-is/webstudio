import {
  CommandBar,
  CommandBarContentPrompt,
  CommandBarContentSection,
  CommandBarContentSeparator,
  CommandBarTrigger,
} from "./command-bar";
import { AutogrowTextArea } from "./autogrow-text-area";
import {
  AiIcon,
  // StopIcon,
  MicIcon,
  // LargeXIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from "@webstudio-is/icons";
import { CommandButton } from "./command-button";
import { Button, Flex, ScrollArea, Box, Grid, Text, theme } from "../..";
import { useState } from "react";

export default {
  title: "Library/AI Command Bar",
};

const CommandBarContent = () => {
  return (
    <>
      <CommandBarContentSection gap={2}>
        <Text variant={"labelsSentenceCase"} align={"center"}>
          Welcome to Webstudio AI alpha!
        </Text>
        <div />
        <Text variant={"labelsSentenceCase"}>
          Ask me to generate or edit sections, text, or images.
          <br /> For example you can say: ”Make a new contact section”
        </Text>
        <Flex align={"end"}>
          <Button
            color="dark"
            css={{
              width: theme.spacing[30],
            }}
            suffix={<ExternalLinkIcon />}
          >
            Learn more
          </Button>
          <Text
            variant={"labelsSentenceCase"}
            color={"subtle"}
            css={{ flex: 1 }}
            align={"center"}
          >
            shortcut ⌘⇧Q
          </Text>
        </Flex>
      </CommandBarContentSection>

      <CommandBarContentSeparator />

      <CommandBarContentSection>
        <Text variant={"labelsSentenceCase"} align={"center"}>
          Previous propmts
        </Text>
        <div />
        <CommandBarContentPrompt>
          Make a new section with a contact form
        </CommandBarContentPrompt>
        <CommandBarContentPrompt>
          Add an image of a cat smiling wearing eyeglasses
        </CommandBarContentPrompt>
        <CommandBarContentPrompt>
          Write a breakup letter for my girlfriend and make it long enough to
          break into multiple lines
        </CommandBarContentPrompt>
        <CommandBarContentPrompt>
          Make all headings bold
        </CommandBarContentPrompt>
      </CommandBarContentSection>
    </>
  );
};

export const Demo = () => {
  const [open, setOpen] = useState(false);

  const commandBarContent = <CommandBarContent />;

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
      <CommandBar
        open={open}
        onOpenChange={setOpen}
        content={commandBarContent}
      >
        <CommandBarTrigger>
          <CommandButton color="dark-ghost">
            <ChevronUpIcon />
          </CommandButton>
        </CommandBarTrigger>

        <Grid
          css={{
            alignSelf: "center",
            // color: theme.colors.foregroundContrastMain,
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
