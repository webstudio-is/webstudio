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
  Webstudio1cIcon,
  XIcon,
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
          collisionPadding={{ bottom: Number.parseFloat(rawTheme.spacing[11]) }}
          side={side}
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
              formAction="https://x.com/getwebstudio"
              prefix={<XIcon />}
              color="dark"
            >
              Follow us on X
            </Button>
          </Flex>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

HelpPopover.Trigger = PopoverTrigger;
