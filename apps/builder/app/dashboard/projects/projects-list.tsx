import { useState } from "react";
import {
  Box,
  Flex,
  Text,
  theme,
  Link,
  css,
  Grid,
  ListItem,
} from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { builderUrl } from "~/shared/router-utils";
import {
  RenameProjectDialog,
  DeleteProjectDialog,
  useCloneProject,
  ShareProjectDialog,
} from "./project-dialogs";
import type { User } from "~/shared/db/user.server";
import { TagsDialog } from "./tags";
import { ProjectMenu } from "./project-menu";
import { formatDate } from "./utils";

// Shared grid template for both header and items
const gridTemplate = "2fr 1fr 1fr 1fr auto";

// Shared padding for header and items
const sharedPadding = theme.spacing[5];

const listHeaderStyles = css({
  padding: sharedPadding,
  borderBottom: `1px solid ${theme.colors.borderMain}`,
  gridTemplateColumns: gridTemplate,
});

const listItemStyles = css({
  padding: sharedPadding,
  gridTemplateColumns: gridTemplate,
  "&:hover": {
    background: theme.colors.backgroundHover,
  },
});

type ProjectsListItemProps = {
  project: DashboardProject;
  hasProPlan: boolean;
  publisherHost: string;
  projectsTags: User["projectsTags"];
};

export const ProjectsListItem = ({
  project: {
    id,
    title,
    domain,
    isPublished,
    createdAt,
    latestBuildVirtual,
    tags,
    domainsVirtual,
  },
  hasProPlan,
  publisherHost,
  projectsTags,
}: ProjectsListItemProps) => {
  const customDomain = domainsVirtual?.find(
    (d: { domain: string; status: string; verified: boolean }) =>
      d.status === "ACTIVE" && d.verified
  )?.domain;
  const displayDomain = customDomain ?? `${domain}.${publisherHost}`;
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const handleCloneProject = useCloneProject(id);

  const projectTagsIds = (tags || [])
    .map((tagId) => {
      const tag = projectsTags.find((tag) => tag.id === tagId);
      return tag ? tag.id : undefined;
    })
    .filter(Boolean) as string[];

  const linkPath = builderUrl({ origin: window.origin, projectId: id });

  if (isHidden) {
    return;
  }

  return (
    <>
      <ListItem index={0} asChild>
        <Grid align="center" gap="5" className={listItemStyles()}>
          {/* Name & View site */}
          <Flex direction="column" gap="1">
            <Link
              href={linkPath}
              color="inherit"
              underline="none"
              css={{ fontWeight: 500 }}
            >
              {title}
            </Link>
            {isPublished && (
              <Link
                href={`https://${displayDomain}`}
                target="_blank"
                rel="noreferrer"
                color="subtle"
                underline="hover"
              >
                View site
              </Link>
            )}
          </Flex>

          {/* Last modified */}
          <Text color="subtle">
            {latestBuildVirtual?.updatedAt
              ? formatDate(latestBuildVirtual.updatedAt)
              : "—"}
          </Text>

          {/* Last published */}
          <Flex align="center" gap="1">
            {latestBuildVirtual?.publishStatus === "PUBLISHED" ? (
              <Text color="subtle">
                {formatDate(latestBuildVirtual.createdAt)}
              </Text>
            ) : (
              <Text color="subtle">Not published</Text>
            )}
          </Flex>

          {/* Date created */}
          <Text color="subtle">{formatDate(createdAt)}</Text>

          {/* Menu */}
          <ProjectMenu
            onDelete={() => setIsDeleteDialogOpen(true)}
            onRename={() => setIsRenameDialogOpen(true)}
            onShare={() => setIsShareDialogOpen(true)}
            onDuplicate={handleCloneProject}
            onUpdateTags={() => setIsTagsDialogOpen(true)}
          />
        </Grid>
      </ListItem>

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
        projectsTags={projectsTags}
        projectTagsIds={projectTagsIds}
        isOpen={isTagsDialogOpen}
        onOpenChange={setIsTagsDialogOpen}
      />
    </>
  );
};

export const ProjectsListHeader = () => {
  return (
    <Grid align="center" gap="5" className={listHeaderStyles()}>
      <Text variant="regularBold">Name</Text>
      <Text variant="regularBold">Last modified</Text>
      <Text variant="regularBold">Last published</Text>
      <Text variant="regularBold">Date created</Text>
      <Box />
      {/* Empty space for menu column - matches IconButton width */}
    </Grid>
  );
};
