import {
  ContentIcon,
  DiscordIcon,
  LifeBuoyIcon,
  YoutubeIcon,
} from "@webstudio-is/icons";

export const help = [
  {
    label: "Support hub",
    url: "https://help.webstudio.is/",
    icon: <LifeBuoyIcon />,
    target: "embed",
  },
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
