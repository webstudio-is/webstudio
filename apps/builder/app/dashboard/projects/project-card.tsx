import { useRevalidator } from "react-router-dom";
import { useEffect, useId, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  DialogClose,
  Checkbox,
  CheckboxAndLabel,
  Label,
  InputField,
  DialogTitleActions,
  Grid,
} from "@webstudio-is/design-system";
import { InfoCircleIcon, EllipsesIcon, PlusIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { builderUrl } from "~/shared/router-utils";
import { nativeClient } from "~/shared/trpc/trpc-client";
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

const TagsDialogContent = ({
  projectId,
  availableTags,
  projectTags,
  onOpenChange,
}: {
  projectId: string;
  availableTags: string[];
  projectTags: string[];
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const revalidator = useRevalidator();
  const tagId = useId();
  const [tags, setTags] = useState(availableTags);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newTags = formData
          .getAll("tag")
          .map((item) => String(item).trim())
          .filter((item) => item);
        await nativeClient.project.updateTags.mutate({
          projectId,
          tags: newTags,
        });
        revalidator.revalidate();
        onOpenChange(false);
      }}
    >
      <DialogTitle
        suffix={
          <DialogTitleActions>
            <Button
              type="button"
              aria-label="Add tag"
              prefix={<PlusIcon />}
              color="ghost"
              onClick={(event) => {
                event.preventDefault();
                setTags((tags) => {
                  let newTag = "New tag";
                  let number = 1;
                  while (tags.includes(newTag)) {
                    number += 1;
                    newTag = `New tag ${number}`;
                  }
                  return [...tags, newTag];
                });
              }}
            />
            <DialogClose />
          </DialogTitleActions>
        }
      >
        Project tags
      </DialogTitle>
      <Grid gap={1} css={{ padding: theme.panel.padding }}>
        {tags.map((tag, index) =>
          availableTags.includes(tag) ? (
            <CheckboxAndLabel key={tag}>
              <Checkbox
                id={tagId + index}
                name="tag"
                value={tag}
                defaultChecked={projectTags.includes(tag)}
              />
              <Label htmlFor={tagId + index}>{tag}</Label>
            </CheckboxAndLabel>
          ) : (
            <InputField
              key={tag}
              name="tag"
              autoFocus
              placeholder="New tag"
              defaultValue={tag}
              autoComplete="off"
            />
          )
        )}
        {tags.length === 0 && <Text align="center">No tags found</Text>}
      </Grid>
      <DialogActions>
        <Button type="submit">Update</Button>
        <DialogClose>
          <Button color="ghost" type="button">
            Cancel
          </Button>
        </DialogClose>
      </DialogActions>
    </form>
  );
};

const TagsDialog = ({
  projectId,
  availableTags,
  projectTags,
  isOpen,
  onOpenChange,
}: {
  projectId: string;
  availableTags: string[];
  projectTags: string[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <TagsDialogContent
          projectId={projectId}
          availableTags={availableTags}
          projectTags={projectTags}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
};

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
  onUpdateTags,
}: {
  tabIndex: number;
  onDelete: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onUpdateTags: () => void;
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
        <DropdownMenuItem onSelect={onUpdateTags}>Tags</DropdownMenuItem>
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
  tags: string[];
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
    tags,
  },
  hasProPlan,
  publisherHost,
  ...props
}: ProjectCardProps) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
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
        <Flex
          wrap="wrap"
          gap={1}
          css={{
            position: "absolute",
            inset: 0,
            padding: theme.panel.padding,
            alignContent: "start",
          }}
        >
          {tags?.map((tag) => (
            <div key={tag}>{tag}</div>
          ))}
        </Flex>
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
          onDelete={() => setIsDeleteDialogOpen(true)}
          onRename={() => setIsRenameDialogOpen(true)}
          onShare={() => setIsShareDialogOpen(true)}
          onDuplicate={handleCloneProject}
          onUpdateTags={() => setIsTagsDialogOpen(true)}
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
      <TagsDialog
        projectId={id}
        availableTags={props.tags}
        projectTags={tags ?? []}
        isOpen={isTagsDialogOpen}
        onOpenChange={setIsTagsDialogOpen}
      />
    </Card>
  );
};
