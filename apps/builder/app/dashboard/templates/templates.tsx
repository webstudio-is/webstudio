import { Flex, Grid, Text, rawTheme, theme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { Header, Main } from "../shared/layout";
import { CreateProject } from "../projects/project-dialogs";
import { TemplateCard } from "./template-card";

type ProjectsProps = {
  templates: Array<DashboardProject>;
  welcome: boolean;
};

export const Templates = ({ templates, welcome }: ProjectsProps) => {
  return (
    <Main>
      <Header variant="main">
        <Text variant="brandSectionTitle" as="h2">
          {welcome ? "What will you create?" : "Starter templates"}
        </Text>
        <Flex gap="2">
          <CreateProject />
        </Flex>
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
              paddingBottom: theme.spacing[13],
            }}
          >
            {templates.map((project) => {
              return <TemplateCard project={project} key={project.id} />;
            })}
          </Grid>
        </Flex>
      )}
    </Main>
  );
};
