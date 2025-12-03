import { useState } from "react";
import {
  Flex,
  Text,
  theme,
  Link,
  css,
  List,
  ListItem,
  IconButton,
} from "@webstudio-is/design-system";
import { ChevronUpIcon, ChevronDownIcon } from "@webstudio-is/icons";
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
import type { SortField, SortOrder } from "./sort";

const tableStyles = css({
  tableLayout: "fixed",
  borderCollapse: "collapse",
  marginBottom: theme.spacing[13],
  minWidth: 550,
  flexGrow: 1,
  "& th": {
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
  },
  "& td": {
    padding: theme.spacing[5],
    verticalAlign: "middle",
  },
  "& tr:hover": {
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
  const [openDialog, setOpenDialog] = useState<
    "rename" | "delete" | "share" | "tags" | undefined
  >(undefined);
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
    return null;
  }

  return (
    <>
      <ListItem index={0} asChild>
        <tr>
          <td>
            <Flex direction="column" gap="1">
              <Link
                href={linkPath}
                color="inherit"
                underline="none"
                css={{ fontWeight: 500 }}
                tabIndex={-1}
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
                  tabIndex={-1}
                >
                  {displayDomain}
                </Link>
              )}
            </Flex>
          </td>

          <td>
            <Text color="subtle">
              {latestBuildVirtual?.updatedAt
                ? formatDate(latestBuildVirtual.updatedAt)
                : formatDate(createdAt)}
            </Text>
          </td>

          <td>
            <Text color="subtle">
              {isPublished && latestBuildVirtual
                ? formatDate(latestBuildVirtual.createdAt)
                : "Not published"}
            </Text>
          </td>

          <td>
            <Text color="subtle">{formatDate(createdAt)}</Text>
          </td>

          <td>
            <ProjectMenu
              onDelete={() => setOpenDialog("delete")}
              onRename={() => setOpenDialog("rename")}
              onShare={() => setOpenDialog("share")}
              onDuplicate={handleCloneProject}
              onUpdateTags={() => setOpenDialog("tags")}
              tabIndex={-1}
            />
          </td>
        </tr>
      </ListItem>

      <RenameProjectDialog
        isOpen={openDialog === "rename"}
        onOpenChange={(open) => setOpenDialog(open ? "rename" : undefined)}
        title={title}
        projectId={id}
      />
      <DeleteProjectDialog
        isOpen={openDialog === "delete"}
        onOpenChange={(open) => setOpenDialog(open ? "delete" : undefined)}
        onHiddenChange={setIsHidden}
        title={title}
        projectId={id}
      />
      <ShareProjectDialog
        isOpen={openDialog === "share"}
        onOpenChange={(open) => setOpenDialog(open ? "share" : undefined)}
        projectId={id}
        hasProPlan={hasProPlan}
      />
      <TagsDialog
        projectId={id}
        projectsTags={projectsTags}
        projectTagsIds={projectTagsIds}
        isOpen={openDialog === "tags"}
        onOpenChange={(open) => setOpenDialog(open ? "tags" : undefined)}
      />
    </>
  );
};

type ProjectsListProps = {
  projects: Array<DashboardProject>;
  hasProPlan: boolean;
  publisherHost: string;
  projectsTags: User["projectsTags"];
  sortBy?: SortField;
  sortOrder?: SortOrder;
  onSortChange: (field: SortField) => void;
};

export const ProjectsList = ({
  projects,
  hasProPlan,
  publisherHost,
  projectsTags,
  sortBy,
  sortOrder,
  onSortChange,
}: ProjectsListProps) => {
  const renderSortButton = (field: SortField, label: string) => {
    const isActive = sortBy === field;
    const ariaLabel = isActive
      ? `Sort by ${label}, currently ${sortOrder === "asc" ? "ascending" : "descending"}`
      : `Sort by ${label}`;
    return (
      <Flex gap="1" align="center">
        <Text variant="regularBold">{label}</Text>
        <IconButton
          aria-label={ariaLabel}
          onClick={() => onSortChange(field)}
          css={{ opacity: isActive ? 1 : 0.5 }}
        >
          {isActive && sortOrder === "asc" ? (
            <ChevronUpIcon />
          ) : (
            <ChevronDownIcon />
          )}
        </IconButton>
      </Flex>
    );
  };

  return (
    <table className={tableStyles()}>
      <thead>
        <tr>
          <th>{renderSortButton("title", "Name")}</th>
          <th>{renderSortButton("updatedAt", "Last modified")}</th>
          <th>{renderSortButton("publishedAt", "Last published")}</th>
          <th>{renderSortButton("createdAt", "Date created")}</th>
          <th></th>
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
