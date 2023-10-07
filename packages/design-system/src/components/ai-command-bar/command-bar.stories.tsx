import { useState } from "react";
import {
  AutogrowTextArea,
  CommandBar,
  CommandBarButton,
  CommandBarContentPrompt,
  CommandBarContentSection,
  CommandBarContentSeparator,
  CommandBarTrigger,
} from "./index";
import { Button, Flex, ScrollArea, Box, Grid, Text, theme } from "../..";
import {
  AiIcon,
  MicIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from "@webstudio-is/icons";

export default {
  title: "Library/AI Command Bar",
};

const CommandBarContent = () => {
  return (
    <>
      <CommandBarContentSection>
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
          <CommandBarButton color="dark-ghost">
            <ChevronUpIcon />
          </CommandBarButton>
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

        <CommandBarButton color="dark-ghost">
          <MicIcon />
        </CommandBarButton>
        <CommandBarButton color="gradient">
          <AiIcon />
        </CommandBarButton>
      </CommandBar>
    </Box>
  );
};
Demo.storyName = "AI Command Bar";
