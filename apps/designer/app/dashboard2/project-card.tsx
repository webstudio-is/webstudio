import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  IconButton,
  css,
  Flex,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { MenuIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/prisma-client";
import { useState } from "react";
import { designerPath, getPublishedUrl } from "~/shared/router-utils";
import { Link as RemixLink } from "@remix-run/react";

const projectCardContainerStyle = css({
  overflow: "hidden",
  width: theme.spacing[31],
  height: theme.spacing[29],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
  borderRadius: theme.borderRadius[4],
  background: "linear-gradient(0deg, #FBF8FF 0%, #C7C7C7 100%)",
  "&:hover, &:focus-within": {
    boxShadow: theme.shadows.brandElevationBig,
  },
});

const projectCardFooterStyle = css({
  background: theme.colors.brandBackgroundProjectCardTextArea,
  height: theme.spacing[17],
  py: theme.spacing[5],
  px: theme.spacing[7],
});

const projectNameAvatarStyle = css({
  fontFamily: theme.fonts.manrope,
  fontWeight: 200,
  fontSize: 360,
  alignSelf: "center",
  letterSpacing: "-0.05em",
  marginLeft: "-0.5em",
  background: "linear-gradient(0deg, #FBF8FF 25%, #E2E2E2 66%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  // @todo figure out the effect from figma in text-shadow
  //textShadow: "0px 5px 3px rgba(251, 248, 255, 1)",
  userSelect: "none",
  "&:hover, &:focus": {
    fontWeight: 800,
    transition: "100ms",
  },
});

// My Next Project > MN
const getAbbreviation = (title: string) =>
  title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

const Domain = ({
  domain,
  isPublished,
}: {
  domain: string;
  isPublished: boolean;
}) => {
  if (isPublished) {
    const url = new URL(getPublishedUrl(domain));
    return (
      <Text
        as="a"
        href={url.href}
        target="_blank"
        truncate
        color="hint"
        css={{
          "&:not(:hover)": {
            textDecoration: "none",
          },
        }}
      >
        {url.host}
      </Text>
    );
  }
  return <Text color="hint">Not Published</Text>;
};

const Menu = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant={isOpen ? "active" : "default"}
          aria-label="Menu Button"
          css={{ alignSelf: "center" }}
        >
          <MenuIcon width={15} height={15} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Text>Duplicate</Text>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Text>Rename</Text>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Text>Share</Text>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Text>Delete</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ProjectCard = ({
  id,
  title,
  domain,
  isPublished,
}: DashboardProject) => {
  return (
    <Flex
      direction="column"
      shrink={false}
      as="article"
      className={projectCardContainerStyle()}
    >
      <Flex
        grow
        align="center"
        as={RemixLink}
        to={designerPath({ projectId: id })}
        className={projectNameAvatarStyle()}
      >
        {getAbbreviation(title)}
      </Flex>
      <Flex
        justify="between"
        shrink={false}
        gap="1"
        className={projectCardFooterStyle()}
      >
        <Flex direction="column" justify="around">
          <Text variant="title" truncate>
            {title}
          </Text>
          <Domain domain={domain} isPublished={isPublished} />
        </Flex>
        <Menu />
      </Flex>
    </Flex>
  );
};
