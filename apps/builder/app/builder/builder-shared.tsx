import type { Asset } from "@webstudio-is/sdk";
import type { Build } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { registerContainers } from "~/shared/sync";
import builderStyles from "./builder.css";
// eslint-disable-next-line import/no-internal-modules
import prismStyles from "prismjs/themes/prism-solarizedlight.min.css";
import {
  $assets,
  $authPermit,
  $authToken,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $styleSourceSelections,
  $styleSources,
  $styles,
  $domains,
  $resources,
} from "~/shared/nano-states";
import { useMount } from "~/shared/hook-utils/use-mount";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import { $userPlanFeatures } from "./shared/nano-states";

registerContainers();

// Can cause FOUC because of remix-island, be very accurate adding anything here
export const links = () => {
  return [
    { rel: "stylesheet", href: builderStyles },
    { rel: "stylesheet", href: prismStyles },
  ];
};

export type BuilderProps = {
  project: Project;
  domains: string[];
  build: Build;
  assets: [Asset["id"], Asset][];
  authToken?: string;
  authPermit: AuthPermit;
  userPlanFeatures: UserPlanFeatures;
};

export const useInitializeStores = ({
  project,
  domains,
  authPermit,
  authToken,
  userPlanFeatures,
  assets,
  build,
}: BuilderProps) => {
  useMount(() => {
    // additional data stores
    $project.set(project);
    $domains.set(domains);
    $authPermit.set(authPermit);
    $authToken.set(authToken);
    $userPlanFeatures.set(userPlanFeatures);

    // set initial containers value
    $assets.set(new Map(assets));
    $instances.set(new Map(build.instances));
    $dataSources.set(new Map(build.dataSources));
    $resources.set(new Map(build.resources));
    // props should be after data sources to compute logic
    $props.set(new Map(build.props));
    $pages.set(build.pages);
    $styleSources.set(new Map(build.styleSources));
    $styleSourceSelections.set(new Map(build.styleSourceSelections));
    $breakpoints.set(new Map(build.breakpoints));
    $styles.set(new Map(build.styles));
  });
};
