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
import { useStore } from "@nanostores/react";
import { TemplateCard } from "./template-card";
import { $permissions } from "~/shared/nano-states";

export const TemplatesGrid = ({
  projects,
}: {
  projects: Array<DashboardProject>;
}) => {
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
              <TemplateCard project={project} />
            </ListItem>
          );
        })}
      </Grid>
    </List>
  );
};

export const Templates = ({
  projects,
  currentWorkspaceId,
}: {
  projects: Array<DashboardProject>;
  currentWorkspaceId?: string;
}) => {
  const permissions = useStore($permissions);
  return (
    <Main>
      <Header variant="main">
        <Text variant="brandSectionTitle" as="h2">
          Starter templates
        </Text>
        {permissions.canCreateProject && (
          <Flex gap="2">
            <CreateProject workspaceId={currentWorkspaceId} />
          </Flex>
        )}
      </Header>
      <Flex
        direction="column"
        gap="3"
        css={{ paddingInline: theme.spacing[13] }}
      >
        <TemplatesGrid projects={projects} />
      </Flex>
    </Main>
  );
};
