import {
  Flex,
  Grid,
  List,
  ListItem,
  Text,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { ProjectCard } from "./project-card";
import { CreateProject } from "./project-dialogs";
import { Header, Main } from "../shared/layout";

export const ProjectsGrid = ({
  projects,
  hasProPlan,
  publisherHost,
}: ProjectsProps) => {
  return (
    <List asChild>
      <Grid
        gap="6"
        css={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${rawTheme.spacing[31]}, 1fr))`,
          paddingBottom: theme.spacing[13],
        }}
      >
        {projects.map((project) => {
          return (
            <ListItem index={0} key={project.id} asChild>
              <ProjectCard
                project={project}
                hasProPlan={hasProPlan}
                publisherHost={publisherHost}
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
  hasProPlan: boolean;
  publisherHost: string;
};

export const Projects = (props: ProjectsProps) => {
  return (
    <Main>
      <Header variant="main">
        <Text variant="brandSectionTitle" as="h2">
          Projects
        </Text>
        <Flex gap="2">
          <CreateProject />
        </Flex>
      </Header>
      <Flex
        direction="column"
        gap="3"
        css={{ paddingInline: theme.spacing[13] }}
      >
        <ProjectsGrid {...props} />
      </Flex>
    </Main>
  );
};
