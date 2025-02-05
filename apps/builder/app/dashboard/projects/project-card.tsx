import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  IconButton,
  css,
  Flex,
  Text,
  truncate,
  theme,
  Tooltip,
  rawTheme,
  Link,
  Box,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, EllipsesIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { builderUrl } from "~/shared/router-utils";
import {
  RenameProjectDialog,
  DeleteProjectDialog,
  useCloneProject,
  ShareProjectDialog,
} from "./project-dialogs";
import {
  ThumbnailLinkWithAbbr,
  ThumbnailLinkWithImage,
} from "../shared/thumbnail";
import { Spinner } from "../shared/spinner";
import { Card, CardContent, CardFooter } from "../shared/card";

const infoIconStyle = css({ flexShrink: 0 });

const PublishedLink = ({
  domain,
  publisherHost,
  tabIndex,
}: {
  domain: string;
  publisherHost: string;
  tabIndex: number;
}) => {
  const publishedOrigin = `https://${domain}.${publisherHost}`;
  return (
    <Link
      href={publishedOrigin}
      target="_blank"
      rel="noreferrer"
      tabIndex={tabIndex}
      color="subtle"
      underline="hover"
      css={truncate()}
    >
      {new URL(publishedOrigin).host}
    </Link>
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
          <EllipsesIcon width={15} height={15} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" css={{ width: theme.spacing[24] }}>
        <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={onShare}>Share</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type ProjectCardProps = {
  project: DashboardProject;
  hasProPlan: boolean;
  publisherHost: string;
};

export const ProjectCard = ({
  project: {
    id,
    title,
    domain,
    isPublished,
    createdAt,
    latestBuildVirtual,
    previewImageAsset,
  },
  hasProPlan,
  publisherHost,
  ...props
}: ProjectCardProps) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const handleCloneProject = useCloneProject(id);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const linkPath = builderUrl({ origin: window.origin, projectId: id });

    const handleNavigate = (event: NavigateEvent) => {
      if (event.destination.url === linkPath) {
        setIsTransitioning(true);
      }
    };

    if (window.navigation === undefined) {
      return;
    }

    window.navigation.addEventListener("navigate", handleNavigate);

    return () => {
      window.navigation.removeEventListener("navigate", handleNavigate);
    };
  }, [id]);

  const linkPath = builderUrl({ origin: window.origin, projectId: id });

  return (
    <Card hidden={isHidden} {...props}>
      <CardContent
        css={{
          background: theme.colors.brandBackgroundProjectCardBack,
          [`&:hover`]: {
            "--ws-project-card-prefetch-image-background": `url(${linkPath}cgi/empty.gif)`,
          },
        }}
      >
        {/* This div with backgorundImage on card hover is used to prefetch DNS of the project domain on hover. */}
        <Box
          css={{
            backgroundImage: `var(--ws-project-card-prefetch-image-background, none)`,
            visibility: "hidden",
            position: "absolute",
            width: 1,
            height: 1,
            left: 0,
            top: 0,
            opacity: 0,
          }}
        />

        {previewImageAsset ? (
          <ThumbnailLinkWithImage to={linkPath} name={previewImageAsset.name} />
        ) : (
          <ThumbnailLinkWithAbbr title={title} to={linkPath} />
        )}
        {isTransitioning && <Spinner delay={0} />}
      </CardContent>
      <CardFooter>
        <Flex direction="column" justify="around" grow>
          <Flex gap="1">
            <Text
              variant="titles"
              userSelect="text"
              truncate
              css={{ textTransform: "none" }}
            >
              {title}
            </Text>
            <Tooltip
              variant="wrapped"
              content={
                <Text variant="small">
                  Created on {formatDate(createdAt)}
                  {latestBuildVirtual?.publishStatus === "PUBLISHED" && (
                    <>
                      <br />
                      Published on {formatDate(latestBuildVirtual.createdAt)}
                    </>
                  )}
                </Text>
              }
            >
              <InfoCircleIcon
                color={rawTheme.colors.foregroundSubtle}
                tabIndex={-1}
                className={infoIconStyle()}
              />
            </Tooltip>
          </Flex>
          {isPublished ? (
            <PublishedLink
              publisherHost={publisherHost}
              domain={domain}
              tabIndex={-1}
            />
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
          onDuplicate={handleCloneProject}
        />
      </CardFooter>
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
    </Card>
  );
};
