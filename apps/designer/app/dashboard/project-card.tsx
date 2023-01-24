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
  toast,
} from "@webstudio-is/design-system";
import { MenuIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/prisma-client";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { designerPath, getPublishedUrl } from "~/shared/router-utils";
import { Link as RemixLink, useFetcher } from "@remix-run/react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

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
  outline: "none",
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

const usePublishedLink = ({ domain }: { domain: string }) => {
  const [url, setUrl] = useState<URL>();

  useEffect(() => {
    // It uses `location` to detect the default values at localhost.
    setUrl(new URL(getPublishedUrl(domain)));
  }, [domain]);

  return { url };
};

const PublishedLink = ({
  domain,
  tabIndex,
}: {
  domain: string;
  tabIndex: number;
}) => {
  const { url } = usePublishedLink({ domain });
  return (
    <Text
      as="a"
      href={url?.href}
      target="_blank"
      truncate
      color="hint"
      tabIndex={tabIndex}
      css={{
        "&:not(:hover)": {
          textDecoration: "none",
        },
      }}
    >
      {url?.host}
    </Text>
  );
};

const Menu = ({
  tabIndex,
  onDelete,
  onRename,
  onDuplicate,
}: {
  tabIndex: number;
  onDelete: () => void;
  onRename: () => void;
  onDuplicate: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant={isOpen ? "active" : "default"}
          aria-label="Menu Button"
          tabIndex={tabIndex}
          css={{ alignSelf: "center" }}
        >
          <MenuIcon width={15} height={15} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onDuplicate}>
          <Text>Duplicate</Text>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>
          <Text>Rename</Text>
        </DropdownMenuItem>
        {isFeatureEnabled("share2") && (
          <DropdownMenuItem>
            <Text>Share</Text>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onDelete}>
          <Text>Delete</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const useProjectCard = () => {
  const fetcher = useFetcher();
  const designerLinkRef = useRef<HTMLAnchorElement>(null);

  // @todo with dialog it can be displayed in the dialog
  useEffect(() => {
    if (fetcher.data?.errors) {
      toast.error(fetcher.data.errors);
    }
  }, [fetcher.data]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const elements: Array<HTMLElement> = Array.from(
      event.currentTarget.querySelectorAll(`[tabIndex='-1']`)
    );
    const currentIndex = elements.indexOf(
      document.activeElement as HTMLElement
    );
    switch (event.key) {
      case "Enter": {
        designerLinkRef.current?.click();
        break;
      }
      case "ArrowUp":
      case "ArrowRight": {
        const nextElement = elements.at(currentIndex + 1) ?? elements[0];
        nextElement?.focus();
        break;
      }
      case "ArrowDown":
      case "ArrowLeft": {
        const nextElement = elements.at(currentIndex - 1) ?? elements[0];
        nextElement?.focus();
        break;
      }
    }
  };

  const handleDelete = (projectId: string) => {
    fetcher.submit(
      { projectId },
      { method: "delete", action: "/dashboard/projects/delete" }
    );
  };

  const handleRename = (projectId: string) => {
    // @todo replace with the new dialog UI, waiting for dialog component
    const title = prompt();
    // User has aborted
    if (title === null) {
      return;
    }
    fetcher.submit(
      { projectId, title },
      { method: "post", action: "/dashboard/projects/rename" }
    );
  };

  const handleDuplicate = (projectId: string) => {
    fetcher.submit(
      { projectId },
      { method: "post", action: "/dashboard/projects/duplicate" }
    );
  };

  return {
    designerLinkRef,
    handleKeyDown,
    handleDelete,
    handleRename,
    handleDuplicate,
  };
};

type ProjectCardProps = DashboardProject;

export const ProjectCard = ({
  id,
  title,
  domain,
  isPublished,
}: ProjectCardProps) => {
  const {
    designerLinkRef,
    handleKeyDown,
    handleDelete,
    handleRename,
    handleDuplicate,
  } = useProjectCard();
  return (
    <Flex
      direction="column"
      shrink={false}
      as="article"
      className={projectCardContainerStyle()}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Flex
        grow
        align="center"
        as={RemixLink}
        ref={designerLinkRef}
        to={designerPath({ projectId: id })}
        className={projectNameAvatarStyle()}
        tabIndex={-1}
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
          {isPublished ? (
            <PublishedLink domain={domain} tabIndex={-1} />
          ) : (
            <Text color="hint">Not Published</Text>
          )}
        </Flex>
        <Menu
          tabIndex={-1}
          onDelete={() => {
            handleDelete(id);
          }}
          onRename={() => {
            handleRename(id);
          }}
          onDuplicate={() => {
            handleDuplicate(id);
          }}
        />
      </Flex>
    </Flex>
  );
};
