import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuItem,
  IconButton,
  css,
  Flex,
  Grid,
  Text,
  theme,
  Box,
} from "@webstudio-is/design-system";
import { MenuIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/prisma-client";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { builderPath, getPublishedUrl } from "~/shared/router-utils";
import {
  RenameProjectDialog,
  DeleteProjectDialog,
  useDuplicate,
  ShareProjectDialog,
  DuplicateProjectDialog,
} from "./project-dialogs";
import { Thumbnail, ThumbnailLink } from "./thumbnail-link";
import { useNavigation } from "@remix-run/react";
import { Spinner } from "../spinner";

const containerStyle = css({
  overflow: "hidden",
  aspectRatio: "8 / 7",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
  borderRadius: theme.borderRadius[4],
  background: theme.colors.brandBackgroundProjectCardBack,
  "&:hover, &:focus-within": {
    boxShadow: theme.shadows.brandElevationBig,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
  },
});

const thumbnailStyle = css({
  position: "relative",
  overflow: "hidden",
  minWidth: "100%",
});

const footerStyle = css({
  background: theme.colors.brandBackgroundProjectCardTextArea,
  height: theme.spacing[17],
  py: theme.spacing[5],
  px: theme.spacing[7],
});

const usePublishedLink = ({ domain }: { domain: string }) => {
  const [url, setUrl] = useState<URL>();

  useEffect(() => {
    // It uses `window.location` to detect the default values when running locally localhost,
    // so it needs an effect to avoid hydration errors.
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
      color="subtle"
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
  onShare,
}: {
  tabIndex: number;
  onDelete: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label="Menu Button"
          tabIndex={tabIndex}
          css={{ alignSelf: "center" }}
        >
          <MenuIcon width={15} height={15} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>
          <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={onShare}>Share</DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

const useProjectCard = () => {
  const thumbnailRef = useRef<HTMLAnchorElement & HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const elements: Array<HTMLElement> = Array.from(
      event.currentTarget.querySelectorAll(`[tabIndex='-1']`)
    );
    const currentIndex = elements.indexOf(
      document.activeElement as HTMLElement
    );
    switch (event.key) {
      case "Enter": {
        // Only open project on enter when the project card container was focused,
        // otherwise we will always open project, even when a menu was pressed.
        if (event.currentTarget === document.activeElement) {
          thumbnailRef.current?.click();
        }
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

  return {
    thumbnailRef,
    handleKeyDown,
  };
};

type ProjectCardProps = Pick<
  DashboardProject,
  "id" | "title" | "domain" | "isPublished"
> & { hasProPlan: boolean };

export const ProjectCard = ({
  id,
  title,
  domain,
  isPublished,
  hasProPlan,
}: ProjectCardProps) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { thumbnailRef, handleKeyDown } = useProjectCard();
  const handleDuplicate = useDuplicate(id);
  const { state, location } = useNavigation();
  const linkPath = builderPath({ projectId: id });
  // Transition to the project has started, we may need to show a spinner
  const isTransitioning = state !== "idle" && linkPath === location.pathname;

  return (
    <Box as="article" hidden={isHidden}>
      <Flex
        direction="column"
        align="center"
        shrink={false}
        className={containerStyle()}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <Grid className={thumbnailStyle()}>
          <ThumbnailLink title={title} to={linkPath} ref={thumbnailRef} />
          {isTransitioning && <Spinner />}
        </Grid>

        <Flex
          justify="between"
          shrink={false}
          alignSelf="stretch"
          gap="1"
          className={footerStyle()}
        >
          <Flex direction="column" justify="around">
            <Text variant="titles" truncate css={{ userSelect: "auto" }}>
              {title}
            </Text>
            {isPublished ? (
              <PublishedLink domain={domain} tabIndex={-1} />
            ) : (
              <Text color="subtle">Not Published</Text>
            )}
          </Flex>
          <Menu
            tabIndex={-1}
            onDelete={() => {
              setIsDeleteDialogOpen(true);
            }}
            onRename={() => {
              setIsRenameDialogOpen(true);
            }}
            onShare={() => {
              setIsShareDialogOpen(true);
            }}
            onDuplicate={handleDuplicate}
          />
        </Flex>
      </Flex>
      <RenameProjectDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        title={title}
        projectId={id}
      />
      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onHiddenChange={setIsHidden}
        title={title}
        projectId={id}
      />
      <ShareProjectDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        projectId={id}
        hasProPlan={hasProPlan}
      />
    </Box>
  );
};

export const ProjectTemplateCard = ({
  id,
  title,
  domain,
  isPublished,
}: Omit<ProjectCardProps, "hasProPlan">) => {
  const { thumbnailRef, handleKeyDown } = useProjectCard();
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  return (
    <Box as="article">
      <Flex
        direction="column"
        align="center"
        shrink={false}
        className={containerStyle()}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <Grid className={thumbnailStyle()}>
          <Thumbnail
            title={title}
            ref={thumbnailRef}
            onClick={() => {
              setIsDuplicateDialogOpen(true);
            }}
          />
        </Grid>

        <Flex
          justify="between"
          shrink={false}
          alignSelf="stretch"
          gap="1"
          className={footerStyle()}
        >
          <Flex direction="column" justify="around">
            <Text variant="titles" truncate css={{ userSelect: "auto" }}>
              {title}
            </Text>
            {isPublished ? (
              <PublishedLink domain={domain} tabIndex={-1} />
            ) : (
              <Text color="subtle">Not Published</Text>
            )}
          </Flex>
        </Flex>
      </Flex>
      <DuplicateProjectDialog
        isOpen={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        title={title}
        projectId={id}
      />
    </Box>
  );
};
