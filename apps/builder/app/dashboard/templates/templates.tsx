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
import { Header, Main } from "../shared/layout";
import { CreateProject } from "../projects/project-dialogs";
import { TemplateCard } from "./template-card";
import { NothingFound } from "../shared/nothing-found";

type ProjectsProps = {
  projects: Array<DashboardProject>;
  welcome: boolean;
};

export const Templates = ({ projects, welcome }: ProjectsProps) => {
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
      <Flex
        direction="column"
        gap="3"
        css={{
          paddingInline: theme.spacing[13],
          paddingTop: projects.length === 0 ? "20vh" : 0,
        }}
      >
        {projects.length === 0 && <NothingFound />}
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
                  <TemplateCard project={project} />
                </ListItem>
              );
            })}
          </Grid>
        </List>
      </Flex>
    </Main>
  );
};
