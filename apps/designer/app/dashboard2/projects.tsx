import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
  IconButton,
  css,
  Flex,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { EmptyState } from "./empty-state";
import { Panel } from "./panel";
import { Heading } from "./heading";
import { MenuIcon, PlusIcon } from "@webstudio-is/icons";
import type { Project } from "@webstudio-is/prisma-client";
import { useState } from "react";

const projectCardContainerStyle = css({
  overflow: "hidden",
  width: theme.spacing[31],
  height: theme.spacing[29],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
  borderRadius: theme.borderRadius[4],
  background: "linear-gradient(0deg, #FBF8FF 0%, #C7C7C7 100%)",
  "&:hover": {
    // @todo use theme
    boxShadow: "0px 8px 16px 0px rgba(23, 23, 23, 0.1)",
    //boxShadow: theme.boxShadow.brandElevationBig,
  },
});

const projectCardFooterStyle = css({
  background: theme.colors.backgroundProjectCardTextArea,
  height: theme.spacing[17],
  py: theme.spacing[5],
  px: theme.spacing[7],
});

const projectNameAvatarStyle = css({
  // @todo use theme
  fontFamily: "ManropeVariable, sans-serif",
  fontWeight: 200,
  fontSize: 360,
  alignSelf: "center",
  letterSpacing: "-0.05em",
  marginLeft: "-0.5em",
  background: "linear-gradient(0deg, #FBF8FF 25%, #E2E2E2 66%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  textFillColor: "transparent",
  // @todo use theme
  textShadow: "5px 3px 0px rgba(251, 248, 255, 1) inset",

  cursor: "default",
  "&:hover": {
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

const domainStyle = css({
  color: theme.colors.foregroundSubtle,
  textDecoration: "none",
  "&:hover": {
    textDecoration: "underline",
  },
});

const Domain = ({ domain }: { domain: string }) => {
  return (
    <Text as="a" href={domain} target="_blank" className={domainStyle()}>
      {domain}
    </Text>
  );
};

const Menu = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant={isOpen ? "active" : "default"}
          aria-label="Menu Button"
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

const ProjectCard = ({ title, domain }: Project) => {
  return (
    <Flex direction="column" className={projectCardContainerStyle()}>
      <Flex grow align="center" className={projectNameAvatarStyle()}>
        {getAbbreviation(title)}
      </Flex>
      <Flex
        justify="between"
        shrink={false}
        className={projectCardFooterStyle()}
      >
        <Flex direction="column" justify="around">
          <Text variant="title">{title}</Text>
          <Domain domain={domain} />
        </Flex>
        <Menu />
      </Flex>
    </Flex>
  );
};

type ProjectsProps = {
  projects: Array<Project>;
};

export const Projects = ({ projects }: ProjectsProps) => {
  return (
    <Panel>
      <Flex direction="column" gap="3">
        <Flex justify="between">
          <Heading variant="small">Projects</Heading>
          <Button prefix={<PlusIcon />}>New Project</Button>
        </Flex>
        {projects.length === 0 && <EmptyState />}
        <Flex gap="6">
          {projects.map((project) => {
            return <ProjectCard {...project} key={project.id} />;
          })}
        </Flex>
      </Flex>
    </Panel>
  );
};
