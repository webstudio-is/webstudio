import { useMemo } from "react";
import { matchSorter } from "match-sorter";
import { useStore } from "@nanostores/react";
import { Flex, Separator, Text, theme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { ProjectsGrid } from "../projects/projects";
import { Header, Main } from "../shared/layout";
import type { DashboardData } from "../shared/types";
import { NothingFound } from "./nothing-found";
import { TemplatesGrid } from "../templates/templates";
import { $searchState } from "./search-field";

type SearchResults = {
  projects: Array<DashboardProject>;
  templates: Array<DashboardProject>;
};

const initialSearchResults: SearchResults = {
  templates: [],
  projects: [],
} as const;

export const SearchResults = (props: DashboardData) => {
  const { projects, templates, userPlanFeatures, publisherHost } = props;
  const search = useStore($searchState);

  const results = useMemo(() => {
    if (!search || !projects || !templates) {
      return initialSearchResults;
    }
    const keys = ["title", "domain"];
    return {
      projects: matchSorter(projects, search, { keys }),
      templates: matchSorter(templates, search, { keys }),
    };
  }, [projects, templates, search]);

  const nothingFound =
    results.projects.length === 0 && results.templates.length === 0;

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
              hasProPlan={userPlanFeatures.hasProPlan}
              publisherHost={publisherHost}
            />
          </>
        )}
        {results.templates.length > 0 && (
          <>
            <Separator />
            <Text variant="brandSectionTitle" as="h2">
              Templates
            </Text>
            <TemplatesGrid projects={results.templates} />
          </>
        )}
      </Flex>
    </Main>
  );
};
