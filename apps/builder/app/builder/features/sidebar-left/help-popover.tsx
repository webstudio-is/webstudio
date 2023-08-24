import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  styled,
  theme,
} from "@webstudio-is/design-system";
import {
  DiscordIcon,
  GithubIcon,
  TwitterIcon,
  WebstudioLogoFlatIcon,
  YoutubeIcon,
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
        collisionPadding={{ bottom: 30 }}
        side={side}
        css={{
          zIndex: theme.zIndices["max"],
        }}
      >
        <Flex
          as="form"
          target="_blank"
          direction="column"
          align="stretch"
          css={{ padding: `${theme.spacing[3]} ${theme.spacing[7]}` }}
          gap="2"
        >
          <Button
            formAction="https://www.youtube.com/playlist"
            name="list"
            value="PL4vVqpngzeT4sDlanyPe99dYl8BgUYCac"
            prefix={<YoutubeIcon />}
            color="destructive"
          >
            Learn with videos
          </Button>

          <Button
            formAction="https://webstudio.is/blog"
            prefix={<WebstudioLogoFlatIcon />}
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
    </Popover>
  );
};

HelpPopover.Trigger = PopoverTrigger;
