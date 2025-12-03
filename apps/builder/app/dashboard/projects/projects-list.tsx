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
  display: "table",
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  marginBottom: theme.spacing[13],
  minWidth: 550,
  flexGrow: 1,

  '& [role="rowgroup"]': {
    display: "table-row-group",
  },

  '& [role="row"]': {
    display: "table-row",
    position: "relative",
    "&:focus-visible": {
      outline: `1px solid ${theme.colors.borderFocus}`,
    },
    '&:has([role="cell"]):hover': {
      background: theme.colors.backgroundHover,
    },
  },

  '& [role="columnheader"]': {
    display: "table-cell",
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

  '& [role="cell"]': {
    display: "table-cell",
    padding: theme.spacing[5],
    verticalAlign: "middle",
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

  if (isHidden) {
    return;
  }

  const projectTagsIds = (tags || [])
    .map((tagId) => {
      const tag = projectsTags.find((tag) => tag.id === tagId);
      return tag ? tag.id : undefined;
    })
    .filter(Boolean) as string[];

  const linkPath = builderUrl({ origin: window.origin, projectId: id });

  return (
    <>
      <ListItem index={0} asChild>
        <div role="row">
          <div role="cell">
            <Flex direction="column" gap="1">
              <Link
                href={linkPath}
                color="inherit"
                underline="none"
                tabIndex={-1}
                stretched
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
                  aria-label={`Visit ${title} website at ${displayDomain}`}
                  css={{ zIndex: 1 }}
                >
                  {displayDomain}
                </Link>
              )}
            </Flex>
          </div>

          <div role="cell">
            <Text color="subtle">
              {latestBuildVirtual?.updatedAt
                ? formatDate(latestBuildVirtual.updatedAt)
                : formatDate(createdAt)}
            </Text>
          </div>

          <div role="cell">
            <Text color="subtle">
              {isPublished && latestBuildVirtual
                ? formatDate(latestBuildVirtual.createdAt)
                : "Not published"}
            </Text>
          </div>

          <div role="cell">
            <Text color="subtle">{formatDate(createdAt)}</Text>
          </div>

          <div role="cell">
            <ProjectMenu
              onDelete={() => setOpenDialog("delete")}
              onRename={() => setOpenDialog("rename")}
              onShare={() => setOpenDialog("share")}
              onDuplicate={handleCloneProject}
              onUpdateTags={() => setOpenDialog("tags")}
            />
          </div>
        </div>
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

const columns: Array<{ field: SortField; label: string } | null> = [
  { field: "title", label: "Name" },
  { field: "updatedAt", label: "Last modified" },
  { field: "publishedAt", label: "Last published" },
  { field: "createdAt", label: "Date created" },
  null, // Actions column (no sorting)
];

export const ProjectsList = ({
  projects,
  hasProPlan,
  publisherHost,
  projectsTags,
  sortBy,
  sortOrder,
  onSortChange,
}: ProjectsListProps) => {
  return (
    <div className={tableStyles()} role="table" aria-label="Projects list">
      <List asChild>
        <div role="rowgroup">
          <ListItem index={0} asChild>
            <div role="row">
              {columns.map((column, index) => (
                <div role="columnheader" key={index}>
                  {column ? (
                    <Flex gap="1" align="center">
                      <Text
                        variant="regularBold"
                        id={`sort-${column.field}-label`}
                      >
                        {column.label}
                      </Text>
                      <IconButton
                        onClick={() => onSortChange(column.field)}
                        css={{ opacity: sortBy === column.field ? 1 : 0.5 }}
                        aria-label={`Sort by ${column.label}${
                          sortBy === column.field
                            ? sortOrder === "asc"
                              ? ", sorted ascending"
                              : ", sorted descending"
                            : ", not sorted"
                        }`}
                        aria-describedby={`sort-${column.field}-label`}
                        tabIndex={-1}
                      >
                        {sortBy === column.field && sortOrder === "asc" ? (
                          <ChevronUpIcon />
                        ) : (
                          <ChevronDownIcon />
                        )}
                      </IconButton>
                    </Flex>
                  ) : undefined}
                </div>
              ))}
            </div>
          </ListItem>
        </div>
      </List>

      <List asChild>
        <div role="rowgroup">
          {projects.map((project) => (
            <ProjectsListItem
              key={project.id}
              project={project}
              hasProPlan={hasProPlan}
              publisherHost={publisherHost}
              projectsTags={projectsTags}
            />
          ))}
        </div>
      </List>
    </div>
  );
};
