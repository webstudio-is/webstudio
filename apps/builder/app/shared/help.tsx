import {
  ContentIcon,
  DiscordIcon,
  YoutubeIcon,
  XLogoIcon,
  BlueskyIcon,
  FacebookIcon,
  LinkedinIcon,
  RedditIcon,
} from "@webstudio-is/icons";

export const socialLinks = [
  { label: "X", url: "https://x.com/getwebstudio", icon: <XLogoIcon /> },
  {
    label: "Bluesky",
    url: "https://bsky.app/profile/webstudio.is",
    icon: <BlueskyIcon />,
  },
  {
    label: "Facebook",
    url: "https://www.facebook.com/webstudiois",
    icon: <FacebookIcon />,
  },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/getwebstudio/",
    icon: <LinkedinIcon />,
  },
  {
    label: "Reddit",
    url: "https://www.reddit.com/r/webstudio/",
    icon: <RedditIcon />,
  },
] as const;

export const help = [
  {
    label: "Video tutorials",
    url: "https://wstd.us/101",
    icon: <YoutubeIcon />,
  },
  {
    label: "Docs",
    url: "https://docs.webstudio.is/",
    icon: <ContentIcon />,
  },
  {
    label: "Community",
    url: "https://wstd.us/community",
    icon: <DiscordIcon />,
  },
] as const;
