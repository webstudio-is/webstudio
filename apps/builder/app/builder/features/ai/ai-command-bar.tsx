import { useStore } from "@nanostores/react";
import {
  AutogrowTextArea,
  Box,
  Button,
  CommandBar,
  CommandBarButton,
  CommandBarContentPrompt,
  CommandBarContentSection,
  CommandBarContentSeparator,
  CommandBarTrigger,
  Flex,
  Grid,
  ScrollArea,
  Text,
  theme,
} from "@webstudio-is/design-system";
import {
  AiIcon,
  MicIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from "@webstudio-is/icons";
import { useState } from "react";
import { $isAiCommandBarVisible } from "~/shared/nano-states";

export const AiCommandBar = () => {
  const [open, setOpen] = useState(false);
  const isAiCommandBarVisible = useStore($isAiCommandBarVisible);

  if (isAiCommandBarVisible === false) {
    return;
  }

  return (
    <Box
      css={{
        position: "absolute",
        bottom: theme.spacing[11],
        left: 0,
        right: 0,
        height: 0,
        justifyContent: "center",
        alignItems: "flex-end",
        display: "flex",
      }}
    >
      <CommandBar
        open={open}
        onOpenChange={setOpen}
        content={<CommandBarContent />}
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
            <AutogrowTextArea autoFocus placeholder="Enter value..." />
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
