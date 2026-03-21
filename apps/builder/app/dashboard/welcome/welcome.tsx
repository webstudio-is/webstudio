import { Flex, Text, theme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { useStore } from "@nanostores/react";
import { Header, Main } from "../shared/layout";
import { CreateProject } from "../projects/project-dialogs";
import { TemplatesGrid } from "../templates/templates";
import { $permissions } from "~/shared/nano-states";

export const Welcome = ({
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
        <Flex direction="column" gap="1">
          <Text variant="brandSectionTitle" as="h2">
            Welcome to Webstudio!
          </Text>
        </Flex>
      </Header>
      <Flex
        direction="column"
        gap="3"
        css={{ paddingInline: theme.spacing[13] }}
      >
        <Flex align="center" gap="2">
          <Text variant="brandRegular">
            Start with a template
            {permissions.canCreateProject ? " or" : ""}
          </Text>
          {permissions.canCreateProject && (
            <CreateProject
              buttonText="Create a blank project"
              workspaceId={currentWorkspaceId}
            />
          )}
        </Flex>
        <TemplatesGrid projects={projects} />
      </Flex>
    </Main>
  );
};
