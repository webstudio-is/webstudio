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
  DiscordIcon,
  GithubIcon,
  Webstudio1cIcon,
  Youtube1cIcon,
} from "@webstudio-is/icons";
import { type ComponentProps } from "react";

export const HelpPopover = ({
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
            formAction="https://www.youtube.com/playlist"
            name="list"
            value="PL4vVqpngzeT4sDlanyPe99dYl8BgUYCac"
            prefix={<Youtube1cIcon />}
            color="destructive"
          >
            Learn with videos
          </Button>
          <Button
            formAction="https://docs.webstudio.is/"
            prefix={<Webstudio1cIcon />}
            color="gradient"
          >
            Learn from docs
          </Button>
          <Button
            formAction="https://discord.gg/UNdyrDkq5r"
            prefix={<DiscordIcon />}
            color="primary"
          >
            Join the Community
          </Button>
          <Button
            formAction="https://github.com/webstudio-is/webstudio-community/discussions"
            prefix={<GithubIcon />}
            color="dark"
          >
            Discuss on GitHub
          </Button>
          <Button
            prefix={<BugIcon />}
            color="dark"
            onClick={() => {
              window.open(
                "https://github.com/webstudio-is/webstudio-community/discussions/new?category=q-a&labels=bug&title=[Bug]"
              );
            }}
          >
            Report a bug
          </Button>
        </Flex>
      </PopoverContent>
    </Popover>
  );
};

HelpPopover.Trigger = PopoverTrigger;
