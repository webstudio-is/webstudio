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
import { useState, type ComponentProps } from "react";

const StyledLink = styled("a", {
  textDecoration: "none",
  color: "white",
  display: "inline-flex",
  cursor: "default",
});

const PopoverItemButton = ({
  href,
  ...buttonProps
}: ComponentProps<typeof Button> & { href?: string }) => (
  <StyledLink href={href} target="_blank" referrerPolicy="no-referrer">
    <Button
      css={{
        width: "100%",
      }}
      {...buttonProps}
    />
  </StyledLink>
);

export const HelpPopover = (props: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {props.children}
      <PopoverContent side="right" css={{ zIndex: theme.zIndices["max"] }}>
        <Flex
          direction="column"
          css={{ padding: `${theme.spacing[5]} ${theme.spacing[7]}` }}
          gap="2"
        >
          <PopoverItemButton
            href="https://www.youtube.com/playlist?list=PL4vVqpngzeT4sDlanyPe99dYl8BgUYCac"
            prefix={<YoutubeIcon />}
            color="destructive"
          >
            Learn with videos
          </PopoverItemButton>

          <PopoverItemButton
            href="https://webstudio.is/blog"
            prefix={<WebstudioLogoFlatIcon />}
            color="gradient"
          >
            Learn on our blog
          </PopoverItemButton>

          <PopoverItemButton
            href="https://discord.gg/UNdyrDkq5r"
            prefix={<DiscordIcon />}
            color="primary"
          >
            Chat with us on Discord
          </PopoverItemButton>

          <PopoverItemButton
            href="https://github.com/webstudio-is/webstudio-community/discussions"
            prefix={<GithubIcon />}
            color="dark"
          >
            Join Github discussions
          </PopoverItemButton>

          <PopoverItemButton
            href="https://twitter.com/getwebstudio"
            prefix={<TwitterIcon />}
            color="dark"
          >
            Follow us on Twitter
          </PopoverItemButton>
        </Flex>
      </PopoverContent>
    </Popover>
  );
};

HelpPopover.Trigger = PopoverTrigger;
