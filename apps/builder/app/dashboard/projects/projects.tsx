import { Flex, Grid, Text } from "@webstudio-is/design-system";
import { EmptyState } from "./empty-state";
import { Panel } from "./panel";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { ProjectCard, ProjectTemplateCard } from "./project-card";
import { CreateProject } from "./project-dialogs";

type ProjectsProps = {
  projects: Array<DashboardProject>;
  projectTemplates: Array<DashboardProject>;
};

export const Projects = ({ projects, projectTemplates }: ProjectsProps) => {
  return (
    <Panel>
      <Flex direction="column" gap="3">
        <Flex justify="between">
          <Text variant="brandSectionTitle" as="h2">
            Projects
          </Text>
          <CreateProject />
        </Flex>
        {projects.length === 0 && <EmptyState />}
        <Grid
          gap="6"
          css={{
            gridTemplateColumns: "repeat(auto-fill, minmax(256px, 1fr))",
          }}
        >
          {projects.map((project) => {
            return <ProjectCard {...project} key={project.id} />;
          })}
        </Grid>
      </Flex>

      {projectTemplates.length > 0 && (
        <Flex direction="column" gap="3">
          <Flex justify="between">
            <Text variant="brandSectionTitle" as="h2">
              Templates
            </Text>
          </Flex>
          <Grid
            gap="6"
            css={{
              gridTemplateColumns: "repeat(auto-fill, minmax(256px, 1fr))",
            }}
          >
            {projectTemplates.map((project) => {
              return <ProjectTemplateCard {...project} key={project.id} />;
            })}
          </Grid>
        </Flex>
      )}
    </Panel>
  );
};
