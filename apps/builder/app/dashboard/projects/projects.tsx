import {
  Flex,
  Grid,
  List,
  ListItem,
  Text,
  rawTheme,
  theme,
  ToggleGroup,
  ToggleGroupButton,
  PanelBanner,
  panelBannerIconColor,
  Link,
  buttonStyle,
} from "@webstudio-is/design-system";
import { RepeatGridIcon, ListViewIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/dashboard";
import type { WorkspaceWithRelation } from "@webstudio-is/project";
import { ProjectCard } from "./project-card";
import { CreateProject } from "./project-dialogs";
import { Header, Main } from "../shared/layout";
import { useSearchParams } from "react-router-dom";
import { setIsSubsetOf } from "~/shared/shim";
import { useStore } from "@nanostores/react";
import type { User } from "~/shared/db/user.server";
import { $permissions } from "~/shared/nano-states";
import { Tag } from "./tags";
import {
  SortSelect,
  sortProjects,
  type SortState,
  type SortField,
} from "./sort";
import { AlertIcon } from "@webstudio-is/icons";
import { getSeatSuspendedMessage } from "~/shared/notifications/seat-suspended";
import { ProjectsList } from "./projects-list";

export const ProjectsGrid = ({
  projects,
  publisherHost,
  projectsTags,
}: ProjectsProps) => {
  return (
    <List asChild>
      <Grid
        gap="6"
        css={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${rawTheme.spacing[31]}, 1fr))`,
          paddingBottom: theme.spacing[13],
          width: "100%",
        }}
      >
        {projects.map((project) => {
          return (
            <ListItem index={0} key={project.id} asChild>
              <ProjectCard
                project={project}
                publisherHost={publisherHost}
                projectsTags={projectsTags}
              />
            </ListItem>
          );
        })}
      </Grid>
    </List>
  );
};

type ProjectsProps = {
  projects: Array<DashboardProject>;
  publisherHost: string;
  projectsTags: User["projectsTags"];
  currentWorkspaceId?: string;
  workspace?: WorkspaceWithRelation;
  isWorkspaceSuspended?: boolean;
};

export const Projects = (props: ProjectsProps) => {
  const permissions = useStore($permissions);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTags = searchParams.getAll("tag");
  const viewMode = (searchParams.get("view") as "grid" | "list") ?? "grid";

  const sortState: SortState = {
    sortBy: searchParams.get("sortBy") as SortState["sortBy"],
    order: searchParams.get("order") as SortState["order"],
  };

  const handleSortChange = (newSortState: Required<SortState>) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sortBy", newSortState.sortBy);
    newParams.set("order", newSortState.order);
    setSearchParams(newParams);
  };

  const handleTableSort = (field: SortField) => {
    const currentSortBy = sortState.sortBy ?? "updatedAt";
    const currentOrder = sortState.order ?? "desc";

    // If clicking the same field, toggle the order
    if (field === currentSortBy) {
      const newOrder = currentOrder === "asc" ? "desc" : "asc";
      handleSortChange({ sortBy: field, order: newOrder });
    } else {
      // When switching to a new field, use smart defaults
      const newOrder = field === "title" ? "asc" : "desc";
      handleSortChange({ sortBy: field, order: newOrder });
    }
  };

  const handleViewChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "grid") {
      newParams.delete("view");
    } else {
      newParams.set("view", value);
    }
    setSearchParams(newParams);
  };

  // Filter by tags
  let projects = props.projects;
  if (selectedTags.length > 0) {
    projects = projects.filter((project) =>
      setIsSubsetOf(new Set(selectedTags), new Set(project.tags))
    );
  }
  projects = sortProjects(projects, sortState);

  return (
    <Main>
      <Header variant="main">
        <Text variant="brandSectionTitle" as="h2">
          Projects
        </Text>
        <Flex gap="2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewChange}
          >
            <ToggleGroupButton value="grid" aria-label="Grid view">
              <RepeatGridIcon />
            </ToggleGroupButton>
            <ToggleGroupButton value="list" aria-label="List view">
              <ListViewIcon />
            </ToggleGroupButton>
          </ToggleGroup>
          <SortSelect value={sortState} onValueChange={handleSortChange} />
          <Link
            className={buttonStyle({ color: "dark" })}
            underline="none"
            href="https://webstudio.is/marketplace/templates/"
            target="_blank"
            color="contrast"
          >
            Use template
          </Link>
          {permissions.canCreateProject && (
            <CreateProject workspaceId={props.currentWorkspaceId} />
          )}
        </Flex>
      </Header>
      <Flex
        gap="2"
        shrink={false}
        justify="between"
        css={{
          paddingInline: theme.spacing[13],
          paddingBlockStart: theme.spacing[2],
          paddingBlockEnd: theme.spacing[10],
        }}
      >
        <Flex gap="2" wrap="wrap" align="center">
          {props.projectsTags.map((tag, index) => {
            return (
              <Tag
                tag={tag}
                key={tag.id}
                index={index}
                state={selectedTags.includes(tag.id) ? "pressed" : "auto"}
              >
                {tag.label}
              </Tag>
            );
          })}
        </Flex>
      </Flex>
      <Flex css={{ paddingInline: theme.spacing[13] }}>
        {projects.length === 0 ? (
          props.isWorkspaceSuspended && props.workspace !== undefined ? (
            <Flex
              css={{
                paddingBlock: theme.spacing[20],
                flexGrow: 1,
                justifyContent: "center",
              }}
            >
              <PanelBanner variant="warning" css={{ maxWidth: 400 }}>
                <Flex align="center" gap="1">
                  <AlertIcon color={panelBannerIconColor} />
                  <Text variant="regularBold">Workspace suspended</Text>
                </Flex>
                <Text variant="regular">
                  {getSeatSuspendedMessage(props.workspace.name)}
                </Text>
              </PanelBanner>
            </Flex>
          ) : (
            <Text
              variant="brandRegular"
              css={{
                paddingBlock: theme.spacing[20],
                textAlign: "center",
                flexGrow: 1,
              }}
            >
              No projects found
            </Text>
          )
        ) : viewMode === "grid" ? (
          <ProjectsGrid {...props} projects={projects} />
        ) : (
          <ProjectsList
            {...props}
            projects={projects}
            sortBy={sortState.sortBy}
            sortOrder={sortState.order}
            onSortChange={handleTableSort}
          />
        )}
      </Flex>
    </Main>
  );
};
