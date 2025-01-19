import { Flex, Grid, Text, rawTheme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { Panel } from "../shared/panel";
import { ProjectTemplateCard } from "./project-card";

type ProjectsProps = {
  templates: Array<DashboardProject>;
  publisherHost: string;
};

export const Templates = ({ templates, publisherHost }: ProjectsProps) => {
  return (
    <Panel>
      {templates.length > 0 && (
        <Flex direction="column" gap="3">
          <Flex justify="between">
            <Text variant="brandSectionTitle" as="h2">
              Starter templates
            </Text>
          </Flex>
          <Grid
            gap="6"
            css={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${rawTheme.spacing[31]}, 1fr))`,
            }}
          >
            {templates.map((project) => {
              return (
                <ProjectTemplateCard
                  project={project}
                  publisherHost={publisherHost}
                  key={project.id}
                />
              );
            })}
          </Grid>
        </Flex>
      )}
    </Panel>
  );
};
