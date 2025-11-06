import { useRevalidator } from "react-router-dom";
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
import { InfoCircleIcon, EllipsesIcon } from "@webstudio-is/icons";
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
import type { User } from "~/shared/db/user.server";
import { nanoid } from "nanoid";

const ProjectTagsContent = ({
  projectId,
  availableTags,
  projectTagsIds,
}: {
  projectId: string;
  availableTags: User["projectsTags"];
  projectTagsIds: string[];
}) => {
  const revalidator = useRevalidator();

  return (
    <form
      onChange={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const tagsIds = formData.getAll("tagId") as string[];
        await nativeClient.project.updateTags.mutate({
          projectId,
          tags: tagsIds,
        });
        revalidator.revalidate();
      }}
    >
      <Grid gap={1} css={{ padding: theme.panel.padding }}>
        {availableTags
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((tag) => (
            <CheckboxAndLabel key={tag.id}>
              <Checkbox
                id={tag.id}
                name="tagId"
                value={tag.id}
                defaultChecked={projectTagsIds.includes(tag.id)}
              />
              <Label htmlFor={tag.id}>{tag.label}</Label>
            </CheckboxAndLabel>
          ))}
        {availableTags.length === 0 && (
          <Text align="center">No tags found</Text>
        )}
      </Grid>
    </form>
  );
};

const ProjectEditTagContent = ({
  availableTags,
  tag,
  onComplete,
}: {
  availableTags: User["projectsTags"];
  tag: User["projectsTags"][number];
  onComplete: () => void;
}) => {
  const revalidator = useRevalidator();

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const label = ((formData.get("tag") as string) || "").trim();
        if (tag.label === label || !label) {
          return;
        }
        const isExisting = availableTags.some(({ id }) => id === tag.id);
        let updatedTags = [];
        if (isExisting) {
          updatedTags = availableTags.map((availableTag) => {
            if (availableTag.id === tag.id) {
              return { ...availableTag, label };
            }
            return availableTag;
          });
        } else {
          updatedTags = [...availableTags, { id: tag.id, label }];
        }

        await nativeClient.user.updateProjectsTags.mutate({
          tags: updatedTags,
        });
        revalidator.revalidate();
        onComplete();
      }}
    >
      <Grid css={{ padding: theme.panel.padding }}>
        <InputField
          autoFocus
          defaultValue={tag.label}
          name="tag"
          placeholder="My tag"
          minLength={1}
        />
      </Grid>
      <DialogActions>
        <Button type="submit">Create tag</Button>
        <Button
          color="ghost"
          type="button"
          onClick={() => {
            onComplete();
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </form>
  );
};

const TagsDialog = ({
  projectId,
  availableTags,
  projectTagsIds,
  isOpen,
  onOpenChange,
}: {
  projectId: string;
  availableTags: User["projectsTags"];
  projectTagsIds: string[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const [editingTag, setEditingTag] = useState<
    User["projectsTags"][number] | undefined
  >();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle
          suffix={
            <DialogTitleActions>
              <DialogClose />
            </DialogTitleActions>
          }
        >
          Project tags
        </DialogTitle>
        {!editingTag && (
          <>
            <ProjectTagsContent
              projectId={projectId}
              availableTags={availableTags}
              projectTagsIds={projectTagsIds}
            />
            <DialogActions>
              <Button
                onClick={() => setEditingTag({ id: nanoid(), label: "" })}
              >
                Create tag
              </Button>
              <DialogClose>
                <Button color="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
            </DialogActions>
          </>
        )}
        {editingTag && (
          <ProjectEditTagContent
            availableTags={availableTags}
            tag={editingTag}
            onComplete={() => setEditingTag(undefined)}
          />
        )}
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
  availableTags: User["projectsTags"];
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
  availableTags,
  ...props
}: ProjectCardProps) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const handleCloneProject = useCloneProject(id);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const projectTagsIds = (tags || [])
    .map((tagId) => {
      const tag = availableTags.find((tag) => tag.id === tagId);
      return tag ? tag.id : undefined;
    })
    .filter(Boolean) as string[];

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
          {projectTagsIds.map((tagId) => {
            const tag = availableTags.find((tag) => tag.id === tagId);
            return tag ? <div key={tag.id}>{tag.label}</div> : undefined;
          })}
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
        availableTags={availableTags}
        projectTagsIds={projectTagsIds}
        isOpen={isTagsDialogOpen}
        onOpenChange={setIsTagsDialogOpen}
      />
    </Card>
  );
};
