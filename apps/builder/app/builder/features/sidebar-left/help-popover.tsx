import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import {
  DiscordIcon,
  GithubIcon,
  TwitterIcon,
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
      <PopoverPortal>
        <PopoverContent
          avoidCollisions
          sideOffset={0}
          // Height of the footer
          collisionPadding={{ bottom: parseFloat(rawTheme.spacing[11]) }}
          side={side}
          // Sidebar has z-index 1, so we need to be above that using portal + same zindex
          css={{ zIndex: theme.zIndices[1] }}
        >
          <Flex
            as="form"
            target="_blank"
            direction="column"
            css={{ px: theme.spacing[7], py: theme.spacing[3] }}
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
              formAction="https://webstudio.is/blog"
              prefix={<Webstudio1cIcon />}
              color="gradient"
            >
              Learn on our blog
            </Button>
            <Button
              formAction="https://discord.gg/UNdyrDkq5r"
              prefix={<DiscordIcon />}
              color="primary"
            >
              Chat with us on Discord
            </Button>
            <Button
              formAction="https://github.com/webstudio-is/webstudio-community/discussions"
              prefix={<GithubIcon />}
              color="dark"
            >
              Join Github discussions
            </Button>
            <Button
              formAction="https://twitter.com/getwebstudio"
              prefix={<TwitterIcon />}
              color="dark"
            >
              Follow us on Twitter
            </Button>
          </Flex>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

HelpPopover.Trigger = PopoverTrigger;
