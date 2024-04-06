import { useMemo } from "react";
import { Flex, Grid, Text, rawTheme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { createImageLoader } from "@webstudio-is/image";
import { EmptyState } from "./empty-state";
import { Panel } from "../shared/panel";
import { ProjectCard, ProjectTemplateCard } from "./project-card";
import { CreateProject } from "./project-dialogs";

type ProjectsProps = {
  projects: Array<DashboardProject>;
  projectTemplates: Array<DashboardProject>;
  hasProPlan: boolean;
  publisherHost: string;
  imageBaseUrl: string;
};

export const Projects = ({
  projects,
  projectTemplates,
  hasProPlan,
  publisherHost,
  imageBaseUrl,
}: ProjectsProps) => {
  const imageLoader = useMemo(
    () => createImageLoader({ imageBaseUrl }),
    [imageBaseUrl]
  );
  return (
    <Panel>
      <Flex direction="column" gap="3">
        <Flex justify="between">
          <Text variant="brandSectionTitle" as="h2">
            Projects
          </Text>
          <Flex gap="2">{projects.length !== 0 && <CreateProject />}</Flex>
        </Flex>
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
                imageLoader={imageLoader}
              />
            );
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
              gridTemplateColumns: `repeat(auto-fill, minmax(${rawTheme.spacing[31]}, 1fr))`,
            }}
          >
            {projectTemplates.map((project) => {
              return (
                <ProjectTemplateCard
                  project={project}
                  publisherHost={publisherHost}
                  key={project.id}
                  imageLoader={imageLoader}
                />
              );
            })}
          </Grid>
        </Flex>
      )}
    </Panel>
  );
};
