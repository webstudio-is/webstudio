import {
  Button,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  theme,
} from "@webstudio-is/design-system";
import {
  DiscordIcon,
  GithubIcon,
  TwitterIcon,
  WebstudioWhiteIcon,
  YoutubeIcon,
} from "@webstudio-is/icons";
import { useState, type ComponentProps } from "react";

const PopoverItemButton = (
  props: ComponentProps<typeof Button> & { background?: string; url?: string }
) => (
  <Button
    css={{
      background: props.background,
      paddingTop: theme.spacing[5],
      paddingBottom: theme.spacing[5],
      paddingLeft: theme.spacing[7],
      paddingRight: theme.spacing[7],
    }}
    onClick={() => {
      if (!props.url) {
        return;
      }
      window.open(props.url);
    }}
    {...props}
  />
);

const popoverItemsList = [
  {
    background: theme.colors.red10,
    content: "Learn the basics with short video",
    prefix: <YoutubeIcon />,
  },
  {
    background:
      "linear-gradient(172deg, rgba(23,116,255,1) 0%, rgba(189,47,219,1) 82%)",
    content: "Learn Webstudio on our blog",
    prefix: <WebstudioWhiteIcon />,
  },
  {
    background: theme.colors.blue11,
    content: "Join the conversation on Discord",
    prefix: <DiscordIcon />,
    url: "https://discord.gg/UNdyrDkq5r",
  },
  {
    background: theme.colors.black,
    content: "Start a Github discussion",
    prefix: <GithubIcon />,
  },
  {
    background: theme.colors.black,
    content: "Join us on Twitter",
    prefix: <TwitterIcon />,
  },
];

export const HelpPopover = (props: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {props.children}
      <PopoverContent side="right" css={{ zIndex: theme.zIndices["max"] }}>
        <Flex direction="column" css={{ padding: theme.spacing[7] }} gap="1">
          {popoverItemsList.map((value, index) => (
            <PopoverItemButton
              key={index}
              background={value.background}
              prefix={value.prefix}
              url={value.url}
            >
              {value.content}
            </PopoverItemButton>
          ))}
        </Flex>
      </PopoverContent>
    </Popover>
  );
};

HelpPopover.displayName = "HelpPopover";
HelpPopover.Trigger = PopoverTrigger;
