import { Flex, Grid, Text, rawTheme, theme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { ProjectTemplateCard } from "./project-card";
import { Header, Main } from "../shared/layout";

type ProjectsProps = {
  templates: Array<DashboardProject>;
  publisherHost: string;
};

export const Templates = ({ templates, publisherHost }: ProjectsProps) => {
  return (
    <Main>
      <Header variant="main">
        <Text variant="brandSectionTitle" as="h2">
          Starter templates
        </Text>
      </Header>
      {templates.length > 0 && (
        <Flex
          direction="column"
          gap="3"
          css={{ paddingInline: theme.spacing[13] }}
        >
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
    </Main>
  );
};
