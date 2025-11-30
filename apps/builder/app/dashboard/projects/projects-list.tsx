import { useState } from "react";
import {
  Flex,
  Text,
  theme,
  Link,
  css,
  List,
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

const tableStyles = css({
  tableLayout: "fixed",
  borderCollapse: "collapse",
  marginBottom: theme.spacing[13],
  minWidth: 550,
  flexGrow: 1,
});

const thStyles = css({
  padding: theme.spacing[5],
  paddingBottom: theme.spacing[3],
  textAlign: "left",
  borderBottom: `1px solid ${theme.colors.borderMain}`,
  "&:first-child": {
    width: "35%",
  },
  "&:nth-child(2), &:nth-child(3), &:nth-child(4)": {
    width: "20%",
  },
  "&:last-child": {
    width: "5%",
  },
});

const tdStyles = css({
  padding: theme.spacing[5],
  verticalAlign: "middle",
});

const trStyles = css({
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
        <tr className={trStyles()}>
          {/* Name & View site */}
          <td className={tdStyles()}>
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
          </td>

          {/* Last modified */}
          <td className={tdStyles()}>
            <Text color="subtle">
              {latestBuildVirtual?.updatedAt
                ? formatDate(latestBuildVirtual.updatedAt)
                : formatDate(createdAt)}
            </Text>
          </td>

          {/* Last published */}
          <td className={tdStyles()}>
            {latestBuildVirtual?.publishStatus === "PUBLISHED" ? (
              <Text color="subtle">
                {formatDate(latestBuildVirtual.createdAt)}
              </Text>
            ) : (
              <Text color="subtle">Not published</Text>
            )}
          </td>

          {/* Date created */}
          <td className={tdStyles()}>
            <Text color="subtle">{formatDate(createdAt)}</Text>
          </td>

          {/* Menu */}
          <td className={tdStyles()}>
            <ProjectMenu
              onDelete={() => setIsDeleteDialogOpen(true)}
              onRename={() => setIsRenameDialogOpen(true)}
              onShare={() => setIsShareDialogOpen(true)}
              onDuplicate={handleCloneProject}
              onUpdateTags={() => setIsTagsDialogOpen(true)}
            />
          </td>
        </tr>
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

type ProjectsListProps = {
  projects: Array<DashboardProject>;
  hasProPlan: boolean;
  publisherHost: string;
  projectsTags: User["projectsTags"];
};

export const ProjectsListTable = ({
  projects,
  hasProPlan,
  publisherHost,
  projectsTags,
}: ProjectsListProps) => {
  return (
    <table className={tableStyles()}>
      <thead>
        <tr>
          <th className={thStyles()}>
            <Text variant="regularBold">Name</Text>
          </th>
          <th className={thStyles()}>
            <Text variant="regularBold">Last modified</Text>
          </th>
          <th className={thStyles()}>
            <Text variant="regularBold">Last published</Text>
          </th>
          <th className={thStyles()}>
            <Text variant="regularBold">Date created</Text>
          </th>
          <th className={thStyles()}></th>
        </tr>
      </thead>
      <List asChild>
        <tbody>
          {projects.map((project) => (
            <ProjectsListItem
              key={project.id}
              project={project}
              hasProPlan={hasProPlan}
              publisherHost={publisherHost}
              projectsTags={projectsTags}
            />
          ))}
        </tbody>
      </List>
    </table>
  );
};
