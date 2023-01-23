import { Flex } from "@webstudio-is/design-system";
import { EmptyState } from "./empty-state";
import { Panel } from "./panel";
import { Heading } from "./heading";
import type { DashboardProject } from "@webstudio-is/prisma-client";
import { ProjectCard } from "./project-card";
import { NewProject } from "./new-project";

const projectsContainerStyle = {
  "@laptop": { minWidth: 900 },
};

type ProjectsProps = {
  projects: Array<DashboardProject>;
};

export const Projects = ({ projects }: ProjectsProps) => {
  return (
    <Panel css={projectsContainerStyle}>
      <Flex direction="column" gap="3">
        <Flex justify="between">
          <Heading variant="small">Projects</Heading>
          <NewProject />
        </Flex>
        {projects.length === 0 && <EmptyState />}
        <Flex gap="6" wrap="wrap">
          {projects.map((project) => {
            return <ProjectCard {...project} key={project.id} />;
          })}
        </Flex>
      </Flex>
    </Panel>
  );
};
