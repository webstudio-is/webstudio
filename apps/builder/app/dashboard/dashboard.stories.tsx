import type { StoryFn } from "@storybook/react";
import type { JSX } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import {
  Box,
  Flex,
  StorySection,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { Dashboard, DashboardSetup } from "./dashboard";
import { Card as CardComponent, CardContent, CardFooter } from "./shared/card";
import { ThumbnailWithAbbr, ThumbnailLinkWithAbbr } from "./shared/thumbnail";
import { defaultPlanFeatures, type PlanFeatures } from "@webstudio-is/plans";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { updateCsrfToken } from "~/shared/csrf.client";

// Set a dummy CSRF token so the custom fetch wrapper does not show
// "CSRF token is not set" toasts in Storybook.
updateCsrfToken("__storybook__");

export default {
  title: "Dashboard",
  component: Dashboard,
};

const user = {
  id: "0",
  createdAt: new Date().toString(),
  email: null,
  image: null,
  username: "Taylor",
  provider: "github",
  projectsTags: [],
};

const createRouter = (element: JSX.Element, path: string, current?: string) =>
  createMemoryRouter([{ path, element }], {
    initialEntries: [current ?? path],
  });

const planFeatures: PlanFeatures = defaultPlanFeatures;

const projects = [
  {
    id: "0",
    createdAt: new Date().toString(),
    title: "My Project",
    domain: "domain.com",
    userId: "",
    isDeleted: false,
    isPublished: false,
    latestBuild: null,
    previewImageAsset: null,
    previewImageAssetId: "",
    latestBuildVirtual: null,
    marketplaceApprovalStatus: "UNLISTED" as const,
    tags: [],
    domainsVirtual: [],
    workspaceId: null,
  } as DashboardProject,
];

const data = {
  user,
  templates: projects,
  planFeatures,
  purchases: [],
  publisherHost: "https://wstd.work",
  projects,
  role: "own" as const,
  workspaces: [],
  notifications: [],
};

export const Welcome: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={{ ...data, projects: [] }} />
      <Dashboard />
    </>,
    "/dashboard/templates"
  );
  return (
    <StorySection title="Welcome">
      <RouterProvider router={router} />
    </StorySection>
  );
};

export const Projects: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={data} />
      <Dashboard />
    </>,
    "/dashboard"
  );
  return (
    <StorySection title="Projects">
      <RouterProvider router={router} />
    </StorySection>
  );
};

export const Templates: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={data} />
      <Dashboard />
    </>,
    "/dashboard/templates"
  );
  return (
    <StorySection title="Templates">
      <RouterProvider router={router} />
    </StorySection>
  );
};

export const Search: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={data} />
      <Dashboard />
    </>,
    "/dashboard/search",
    "/dashboard/search?q=my"
  );

  return (
    <StorySection title="Search">
      <RouterProvider router={router} />
    </StorySection>
  );
};

export const SearchNothingFound: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={data} />
      <Dashboard />
    </>,
    "/dashboard/search",
    "/dashboard/search?q=notfound"
  );
  return (
    <StorySection title="Search Nothing Found">
      <RouterProvider router={router} />
    </StorySection>
  );
};

export const Card = () => (
  <StorySection title="Card">
    <Flex gap="3" wrap="wrap" align="start">
      <Box css={{ width: theme.spacing[30] }}>
        <CardComponent>
          <CardContent
            css={{ background: theme.colors.brandBackgroundProjectCardFront }}
          />
          <CardFooter>
            <Text truncate>My project</Text>
          </CardFooter>
        </CardComponent>
      </Box>
      <Box css={{ width: theme.spacing[30] }}>
        <CardComponent aria-selected={true}>
          <CardContent
            css={{ background: theme.colors.brandBackgroundProjectCardFront }}
          />
          <CardFooter>
            <Text truncate>Selected project</Text>
          </CardFooter>
        </CardComponent>
      </Box>
      {["Project Alpha", "My Website", "Landing Page"].map((title) => (
        <Box key={title} css={{ width: theme.spacing[30] }}>
          <CardComponent>
            <CardContent
              css={{ background: theme.colors.brandBackgroundProjectCardFront }}
            />
            <CardFooter>
              <Text truncate>{title}</Text>
            </CardFooter>
          </CardComponent>
        </Box>
      ))}
    </Flex>
  </StorySection>
);

export const Thumbnails = () => (
  <StorySection title="Thumbnails">
    <Flex gap="3">
      <ThumbnailWithAbbr title="My Next Project" onClick={() => {}} />
      <ThumbnailLinkWithAbbr title="Landing Page" to="#" />
      <ThumbnailWithAbbr title="Portfolio" onClick={() => {}} />
    </Flex>
  </StorySection>
);
