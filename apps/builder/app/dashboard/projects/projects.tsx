import {
  Box,
  Button,
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

export const ProjectsGrid = ({
  projects,
  hasProPlan,
  publisherHost,
  tags,
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
                tags={tags}
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
  tags: string[];
};

export const Projects = (props: ProjectsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
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
          paddingBlockEnd: theme.spacing[10],
          "&:has(*:first-child)": {
            display: "flex",
          },
        }}
      >
        {props.tags.map((tag) => (
          <Button
            key={tag}
            state={selectedTags.includes(tag) ? "pressed" : "auto"}
            onClick={() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete("tag");
              if (!selectedTags.includes(tag)) {
                newSearchParams.append("tag", tag);
              }
              for (const item of selectedTags) {
                if (item !== tag) {
                  newSearchParams.append("tag", item);
                }
              }
              setSearchParams(newSearchParams);
            }}
          >
            {tag}
          </Button>
        ))}
      </Flex>
      <Box css={{ paddingInline: theme.spacing[13] }}>
        <ProjectsGrid {...props} projects={projects} />
      </Box>
    </Main>
  );
};
