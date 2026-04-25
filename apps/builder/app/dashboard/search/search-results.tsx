import { useMemo } from "react";
import { matchSorter } from "match-sorter";
import { useSearchParams } from "react-router-dom";
import { Flex, Text, theme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { ProjectsGrid } from "../projects/projects";
import { Header, Main } from "../shared/layout";
import type { DashboardData } from "../shared/types";
import { NothingFound } from "./nothing-found";

type SearchResults = {
  projects: Array<DashboardProject>;
};

const initialSearchResults: SearchResults = {
  projects: [],
} as const;

export const SearchResults = (props: DashboardData) => {
  const [searchParams] = useSearchParams();
  const { projects, publisherHost } = props;
  const search = searchParams.get("q");

  const results = useMemo(() => {
    if (!search || !projects) {
      return initialSearchResults;
    }
    const keys = ["title", "domain"];
    return {
      projects: matchSorter(projects, search, { keys }),
    };
  }, [projects, search]);

  const nothingFound = results.projects.length === 0;

  return (
    <Main>
      <Header variant="main">
        <Text variant="brandRegular">
          Search results for <b>"{search}"</b>
        </Text>
      </Header>
      <Flex
        direction="column"
        gap="3"
        css={{
          paddingInline: theme.spacing[13],
          paddingTop: nothingFound ? "20vh" : 0,
        }}
      >
        {nothingFound && <NothingFound />}
        {results.projects.length > 0 && (
          <>
            <Text variant="brandSectionTitle" as="h2">
              Projects
            </Text>
            <ProjectsGrid
              projects={results.projects}
              publisherHost={publisherHost}
              projectsTags={props.user.projectsTags}
            />
          </>
        )}
      </Flex>
    </Main>
  );
};
