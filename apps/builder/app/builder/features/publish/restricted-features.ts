import type { ReactNode } from "react";
import {
  getAllPages,
  isPathnamePattern,
  type DataSource,
  type Instance,
  type Pages,
} from "@webstudio-is/sdk";
import { findPageAndSelectorByInstanceId } from "@webstudio-is/project-build/runtime/lookup";
import type { ProjectSettings } from "@webstudio-is/project-build";

export type RestrictedFeature =
  | undefined
  | {
      navigate?: { pageId: string; instanceSelector: string[] };
      view?: "pageSettings";
      info?: ReactNode;
    };

export type RestrictedFeaturesPermissions = {
  maxContactEmailsPerProject: number;
  allowAuth: boolean;
  allowDynamicData: boolean;
};

export const getRestrictedFeatures = ({
  pages,
  projectSettings,
  dataSources,
  instances,
  permissions,
}: {
  pages: Pages | undefined;
  projectSettings?: ProjectSettings;
  dataSources: Map<string, DataSource>;
  instances: Map<string, Instance>;
  permissions: RestrictedFeaturesPermissions;
}) => {
  const features = new Map<string, RestrictedFeature>();
  if (pages === undefined) {
    return features;
  }
  const projectMeta = projectSettings?.meta;
  if (
    permissions.maxContactEmailsPerProject === 0 &&
    (projectMeta?.contactEmail ?? "").trim()
  ) {
    features.set("Custom contact email", undefined);
  }
  if (permissions.allowAuth === false) {
    if ((projectMeta?.auth ?? "").trim()) {
      features.set("Project auth", undefined);
    }
    for (const page of getAllPages(pages)) {
      if (page.meta.auth !== undefined) {
        features.set("Page auth", {
          navigate: {
            pageId: page.id,
            instanceSelector: [page.rootInstanceId],
          },
          view: "pageSettings",
        });
      }
    }
  }
  if (permissions.allowDynamicData === false) {
    for (const page of getAllPages(pages)) {
      const navigate = {
        pageId: page.id,
        instanceSelector: [page.rootInstanceId],
      };
      if (isPathnamePattern(page.path) && page.path !== "/*") {
        features.set("Dynamic path", { navigate, view: "pageSettings" });
      }
      if (page.meta.redirect && page.meta.redirect !== `""`) {
        features.set("Redirect", { navigate, view: "pageSettings" });
      }
    }
    for (const dataSource of dataSources.values()) {
      if (dataSource.type === "resource") {
        const instanceId = dataSource.scopeInstanceId ?? "";
        features.set("Resource variable", {
          navigate: findPageAndSelectorByInstanceId(
            pages,
            instances,
            instanceId
          ),
        });
      }
    }
  }
  return features;
};
