import { Flex, Text, Link, buttonStyle } from "@webstudio-is/design-system";
import {
  YoutubeIcon,
  ContentIcon,
  DiscordIcon,
  XLogoIcon,
  BlueskyIcon,
  FacebookIcon,
  RedditIcon,
} from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { Main } from "../shared/layout";
import { CreateProject } from "../projects/project-dialogs";
import { $permissions } from "~/shared/nano-states";

const guideItems = [
  {
    icon: <YoutubeIcon />,
    label: "Watch video tutorials",
    href: "https://wstd.us/101",
  },
  {
    icon: <ContentIcon />,
    label: "Read the docs",
    href: "https://docs.webstudio.is/",
  },
  {
    icon: <DiscordIcon />,
    label: "Join the community on Discord",
    href: "https://wstd.us/community",
  },
];

const socialItems = [
  { icon: <XLogoIcon />, label: "X", href: "https://x.com/getwebstudio" },
  {
    icon: <BlueskyIcon />,
    label: "Bluesky",
    href: "https://bsky.app/profile/webstudio.is",
  },
  {
    icon: <FacebookIcon />,
    label: "Facebook",
    href: "https://www.facebook.com/getwebstudio1/",
  },
  {
    icon: <RedditIcon />,
    label: "Reddit",
    href: "https://www.reddit.com/r/webstudio/",
  },
];

export const Welcome = ({
  currentWorkspaceId,
}: {
  currentWorkspaceId?: string;
}) => {
  const permissions = useStore($permissions);
  return (
    <Main>
      <Flex
        direction="column"
        align="center"
        grow
        gap="7"
        css={{ paddingBlock: "20vh" }}
      >
        <Text variant="brandMediumTitle" as="h3">
          Welcome!
        </Text>

        <Flex align="center" gap="3">
          <Link
            className={buttonStyle({ color: "dark" })}
            underline="none"
            href="https://webstudio.is/marketplace/templates/"
            target="_blank"
            color="contrast"
          >
            Start from a template
          </Link>
          {permissions.canCreateProject && (
            <CreateProject
              workspaceId={currentWorkspaceId}
              buttonText="Create a blank project"
            />
          )}
        </Flex>

        <Flex direction="column" gap="2">
          {guideItems.map(({ icon, label, href }) => (
            <Flex key={href} align="center" gap="2">
              {icon}
              <Link href={href} target="_blank" color="subtle">
                {label}
              </Link>
            </Flex>
          ))}
          <Flex align="center" gap="2">
            <Text color="subtle">Follow for updates on:</Text>
            {socialItems.map(({ icon, label, href }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                color="subtle"
                aria-label={label}
              >
                {icon}
              </Link>
            ))}
          </Flex>
        </Flex>
      </Flex>
    </Main>
  );
};
