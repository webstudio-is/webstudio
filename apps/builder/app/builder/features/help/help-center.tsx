import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import {
  BugIcon,
  ContentIcon,
  DiscordIcon,
  GithubIcon,
  LifeBuoyIcon,
  YoutubeIcon,
} from "@webstudio-is/icons";
import { type ComponentProps } from "react";
import { $remoteDialog } from "../../shared/nano-states";

export const HelpCenter = ({
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
          css={{ padding: theme.spacing[5] }}
          gap="2"
        >
          <Button
            type="button"
            prefix={<LifeBuoyIcon />}
            css={{ justifyContent: "start" }}
            color="ghost"
            onClick={() => {
              $remoteDialog.set({
                title: "Support Hub",
                url: "https://help.webstudio.is/",
              });
            }}
          >
            Support Hub
          </Button>
          <Button
            formAction="https://wstd.us/101"
            name="list"
            value="PL4vVqpngzeT4sDlanyPe99dYl8BgUYCac"
            prefix={<YoutubeIcon />}
            color="ghost"
            css={{ justifyContent: "start" }}
          >
            Learn with videos
          </Button>
          <Button
            formAction="https://docs.webstudio.is/"
            prefix={<ContentIcon />}
            color="ghost"
            css={{ justifyContent: "start" }}
          >
            Learn from docs
          </Button>
          <Button
            formAction="https://wstd.us/community"
            prefix={<DiscordIcon />}
            color="ghost"
            css={{ justifyContent: "start" }}
          >
            Join the Community
          </Button>
          <Button
            formAction="https://github.com/webstudio-is/webstudio-community/discussions"
            prefix={<GithubIcon fill="currentColor" />}
            color="ghost"
            css={{ justifyContent: "start" }}
          >
            Discuss on GitHub
          </Button>
          <Button
            prefix={<BugIcon />}
            color="ghost"
            onClick={() => {
              window.open(
                "https://github.com/webstudio-is/webstudio-community/discussions/new?category=q-a&labels=bug&title=[Bug]"
              );
            }}
            css={{ justifyContent: "start" }}
          >
            Report a bug
          </Button>
        </Flex>
      </PopoverContent>
    </Popover>
  );
};

HelpCenter.Trigger = PopoverTrigger;
