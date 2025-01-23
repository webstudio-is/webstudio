import {
  Flex,
  Grid,
  InputField,
  List,
  ListItem,
  SearchField,
  Text,
  findNextListItemIndex,
  rawTheme,
  theme,
  useSearchFieldKeys,
} from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { EmptyState } from "./empty-state";
import { ProjectCard } from "./project-card";
import { CreateProject } from "./project-dialogs";
import { Header, Main } from "../shared/layout";
import { useState } from "react";
import { matchSorter } from "match-sorter";
import { builderUrl } from "~/shared/router-utils";

type ProjectsProps = {
  projects: Array<DashboardProject>;
  hasProPlan: boolean;
  publisherHost: string;
};

export const Projects = ({
  projects,
  hasProPlan,
  publisherHost,
}: ProjectsProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>();

  const resetSelectedProjectId = () => setSelectedProjectId(undefined);

  const searchProps = useSearchFieldKeys({
    onChange: resetSelectedProjectId,
    onCancel: resetSelectedProjectId,
    onMove({ direction }) {
      if (direction === "current") {
        location.href = builderUrl({
          origin: window.origin,
          projectId: selectedProjectId ?? foundProjects[0].id,
        });
        return;
      }
      const index = foundProjects.findIndex(
        (project) => project.id === selectedProjectId
      );
      const nextIndex = findNextListItemIndex(
        index,
        foundProjects.length,
        direction
      );

      setSelectedProjectId(foundProjects[nextIndex].id);
    },
  });

  const foundProjects = searchProps.value
    ? matchSorter(projects, searchProps.value, {
        keys: ["title", "domain"],
      })
    : projects;

  return (
    <Main>
      <Header variant="main">
        <Text variant="brandSectionTitle" as="h2">
          Projects
        </Text>
        <Flex gap="2">
          <SearchField {...searchProps} autoFocus placeholder="Find projects" />
          <CreateProject />
        </Flex>
      </Header>
      <Flex
        direction="column"
        gap="3"
        css={{
          paddingInline: theme.spacing[13],
          paddingTop: projects.length === 0 ? "20vh" : 0,
        }}
      >
        {foundProjects.length === 0 && <EmptyState />}
        <List asChild>
          <Grid
            gap="6"
            css={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${rawTheme.spacing[31]}, 1fr))`,
              paddingBottom: theme.spacing[13],
            }}
          >
            {foundProjects.map((project, index) => {
              return (
                <ListItem
                  state={
                    project.id === selectedProjectId ? "selected" : undefined
                  }
                  index={index}
                  key={project.id}
                  asChild
                >
                  <ProjectCard
                    project={project}
                    key={project.id}
                    hasProPlan={hasProPlan}
                    publisherHost={publisherHost}
                  />
                </ListItem>
              );
            })}
          </Grid>
        </List>
      </Flex>
    </Main>
  );
};
