import { ContentIcon, DiscordIcon, YoutubeIcon } from "@webstudio-is/icons";

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
