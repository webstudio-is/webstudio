import {
  Box,
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
import { useSearchParams } from "react-router-dom";
import { setIsSubsetOf } from "~/shared/shim";
import type { User } from "~/shared/db/user.server";
import { Tag } from "./tags";

export const ProjectsGrid = ({
  projects,
  hasProPlan,
  publisherHost,
  projectsTags,
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
                projectsTags={projectsTags}
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
  projectsTags: User["projectsTags"];
};

export const Projects = (props: ProjectsProps) => {
  const [searchParams] = useSearchParams();
  const selectedTags = searchParams.getAll("tag");
  let projects = props.projects;
  if (selectedTags.length > 0) {
    projects = projects.filter((project) =>
      setIsSubsetOf(new Set(selectedTags), new Set(project.tags))
    );
  }

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
        gap="2"
        wrap="wrap"
        css={{
          display: "none",
          flexShrink: 0,
          paddingInline: theme.spacing[13],
          paddingBlockStart: theme.spacing[2],
          paddingBlockEnd: theme.spacing[10],
          "&:has(*:first-child)": {
            display: "flex",
          },
        }}
      >
        {props.projectsTags.map((tag, index) => {
          return (
            <Tag
              tag={tag}
              key={tag.id}
              index={index}
              state={selectedTags.includes(tag.id) ? "pressed" : "auto"}
            >
              {tag.label}
            </Tag>
          );
        })}
      </Flex>
      <Box css={{ paddingInline: theme.spacing[13] }}>
        {projects.length === 0 && (
          <Text
            variant="brandRegular"
            css={{ padding: theme.spacing[13], textAlign: "center" }}
          >
            No projects found
          </Text>
        )}
        <ProjectsGrid {...props} projects={projects} />
      </Box>
    </Main>
  );
};
