import { Flex, Grid, Text, rawTheme, theme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { EmptyState } from "./empty-state";
import { ProjectCard } from "./project-card";
import { CreateProject } from "./project-dialogs";
import { Header } from "../shared/header";

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
  return (
    <Flex direction="column" grow>
      <Header variant="main">
        <Text variant="brandSectionTitle" as="h2">
          Projects
        </Text>
        <Flex gap="2">{projects.length !== 0 && <CreateProject />}</Flex>
      </Header>
      <Flex
        direction="column"
        gap="3"
        css={{ paddingInline: theme.spacing[13] }}
      >
        {projects.length === 0 && <EmptyState />}
        <Grid
          gap="6"
          css={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${rawTheme.spacing[31]}, 1fr))`,
          }}
        >
          {projects.map((project) => {
            return (
              <ProjectCard
                project={project}
                key={project.id}
                hasProPlan={hasProPlan}
                publisherHost={publisherHost}
              />
            );
          })}
        </Grid>
      </Flex>
    </Flex>
  );
};
