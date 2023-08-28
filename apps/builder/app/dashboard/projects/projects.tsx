import { Button, Flex, Grid, Text } from "@webstudio-is/design-system";
import { EmptyState } from "./empty-state";
import { Panel } from "./panel";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { ProjectCard, ProjectTemplateCard } from "./project-card";
import { CreateProject } from "./project-dialogs";
import { HelpPopover } from "~/builder/features/sidebar-left/help-popover";
import { HelpIcon } from "@webstudio-is/icons";
import { useState } from "react";

type ProjectsProps = {
  projects: Array<DashboardProject>;
  projectTemplates: Array<DashboardProject>;
};

export const Projects = ({ projects, projectTemplates }: ProjectsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Panel>
      <Flex direction="column" gap="3">
        <Flex justify="between">
          <Text variant="brandSectionTitle" as="h2">
            Projects
          </Text>
          <Flex gap="2">
            <HelpPopover open={isOpen} onOpenChange={setIsOpen} side="bottom">
              <HelpPopover.Trigger asChild>
                <Button
                  color="gradient"
                  prefix={<HelpIcon size={16} color="#fff" />}
                >
                  Learn Webstudio or ask for help
                </Button>
              </HelpPopover.Trigger>
            </HelpPopover>
            <CreateProject />
          </Flex>
        </Flex>
        {projects.length === 0 && <EmptyState />}
        <Grid
          gap="6"
          css={{
            gridTemplateColumns: "repeat(auto-fill, minmax(256px, 1fr))",
          }}
        >
          {projects.map((project) => {
            return <ProjectCard {...project} key={project.id} />;
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
              gridTemplateColumns: "repeat(auto-fill, minmax(256px, 1fr))",
            }}
          >
            {projectTemplates.map((project) => {
              return <ProjectTemplateCard {...project} key={project.id} />;
            })}
          </Grid>
        </Flex>
      )}
    </Panel>
  );
};
