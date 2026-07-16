import type { Server } from "node:http";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import React from "react";
import type { BuilderState } from "@webstudio-is/project-build/state";
import { createBuilderStateFreshness } from "@webstudio-is/project-build/state";
import type { BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime";
import type { BuilderPatchTransaction } from "@webstudio-is/project-build/contracts";
import type { HighImpactFixture, EvaluationProject } from "./fixtures";
import type { EvaluationToolCall } from "./validate";
import {
  createRuntimeFixtureBuildSnapshot,
  publicApiCommandByOperationId,
  runtimeFixturePermissions,
  startRuntimeFixtureApi,
} from "../../scripts/runtime-fixture-api";

const projectId = "high-impact-evaluation-project";
const buildId = "high-impact-evaluation-build";
const initialVersion = 1;

const createPersistedPages = (project: EvaluationProject) => ({
  meta: { siteName: "High-impact evaluation", contactEmail: "" },
  compiler: { atomicStyles: true },
  redirects: [],
  homePageId: "home",
  rootFolderId: "root-folder",
  pages: project.pages.map((page) => ({
    ...page,
    title: page.name,
    meta: {},
  })),
  folders: [
    {
      id: "root-folder",
      name: "Root",
      slug: "",
      children: project.pages.map((page) => page.id),
    },
  ],
});

const stateToProject = (state: BuilderState): EvaluationProject => ({
  pages: Array.from(state.pages?.pages.values() ?? []).map((page) => ({
    id: page.id,
    name: page.name,
    path: page.path,
    rootInstanceId: page.rootInstanceId,
  })),
  instances: Array.from(
    state.instances?.values() ?? []
  ) as EvaluationProject["instances"],
  props: Array.from(state.props?.values() ?? []) as EvaluationProject["props"],
  dataSources: Array.from(state.dataSources?.values() ?? []) as Array<
    Record<string, unknown>
  >,
  resources: Array.from(state.resources?.values() ?? []) as Array<
    Record<string, unknown>
  >,
  breakpoints: Array.from(state.breakpoints?.values() ?? []),
  styleSources: Array.from(state.styleSources?.values() ?? []),
  styleSourceSelections: Array.from(
    state.styleSourceSelections?.values() ?? []
  ),
  styles: Array.from(
    state.styles?.values() ?? []
  ) as EvaluationProject["styles"],
});

export type HighImpactFixtureApi = {
  server: Server;
  origin: string;
  shareLink: string;
  getProject: () => EvaluationProject;
  getToolCalls: () => EvaluationToolCall[];
  close: () => Promise<void>;
};

export const startHighImpactFixtureApi = async (
  fixture: HighImpactFixture
): Promise<HighImpactFixtureApi> => {
  Object.assign(globalThis, { React });
  const [stateAdapters, runtime, projectSession] = await Promise.all([
    import("@webstudio-is/project-build/state"),
    import("@webstudio-is/project-build/runtime"),
    import("../../src/project-session"),
  ]);
  const { createBuilderStateFromBuildData, applyBuilderPatchTransactions } =
    stateAdapters;
  const { executeBuilderRuntimeOperation } = runtime;
  const { createLocalProjectBundleFromSessionSnapshot } = projectSession;
  const persistedPages = createPersistedPages(fixture.project);
  const build = {
    id: buildId,
    projectId,
    version: initialVersion,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    pages: migratePages(persistedPages),
    instances: fixture.project.instances.map((instance) => ({
      type: "instance" as const,
      ...instance,
    })),
    props: fixture.project.props,
    dataSources: fixture.project.dataSources,
    resources: fixture.project.resources,
    breakpoints: fixture.project.breakpoints,
    styleSources: fixture.project.styleSources,
    styleSourceSelections: fixture.project.styleSourceSelections,
    styles: fixture.project.styles,
    assets: [],
    projectSettings: { meta: {}, compiler: {} },
  };
  let state = createBuilderStateFromBuildData(build as never);
  let version = initialVersion;
  let generatedId = 0;
  const calls: EvaluationToolCall[] = [];
  let origin = "";
  const fixtureApi = await startRuntimeFixtureApi(
    async ({ operationPath, readInput }) => {
      let data: unknown;
      if (operationPath === "build.loadProjectBundleByProjectId") {
        data = createLocalProjectBundleFromSessionSnapshot(
          {
            projectId,
            buildId,
            version,
            state,
            freshness: createBuilderStateFreshness({ state, version }),
            compatibilityVersion: "high-impact-fixture-v1",
            compatibility: {
              sessionVersion: "high-impact-fixture-v1",
              runtimeContractVersion: "high-impact-fixture-v1",
              projectSchemaVersion: "high-impact-fixture-v1",
            },
          },
          { origin }
        );
      } else if (operationPath === "projects.get") {
        data = {
          id: projectId,
          name: "High-impact evaluation",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          buildId,
          version,
          homePageId: "home",
          features: {},
        };
      } else if (operationPath === "build.patch") {
        const input = (await readInput()) as {
          transactions?: BuilderPatchTransaction[];
        };
        state = applyBuilderPatchTransactions(
          state,
          input.transactions ?? []
        ).state;
        version += 1;
        data = { version };
      } else if (operationPath === "build.get") {
        data = createRuntimeFixtureBuildSnapshot({
          state,
          projectId,
          buildId,
          version,
        });
      } else if (
        operationPath === "projects.permissions" ||
        operationPath === ""
      ) {
        data = runtimeFixturePermissions;
      } else {
        const input = await readInput();
        const call: EvaluationToolCall = {
          name:
            publicApiCommandByOperationId.get(operationPath) ?? operationPath,
          arguments:
            typeof input === "object" && input !== null
              ? (input as Record<string, unknown>)
              : undefined,
        };
        calls.push(call);
        try {
          const result = await executeBuilderRuntimeOperation({
            id: operationPath,
            state,
            input,
            context: {
              createId: () => `evaluation-${generatedId++}`,
              projectId,
              projectVersion: version,
            },
          });
          if (
            typeof result === "object" &&
            result !== null &&
            "kind" in result &&
            (result as BuilderRuntimeMutation).kind === "mutation"
          ) {
            const mutation = result as BuilderRuntimeMutation;
            state = applyBuilderPatchTransactions(state, [
              {
                id: `evaluation-transaction-${generatedId++}`,
                payload: mutation.payload,
              },
            ]).state;
            version += 1;
            data = mutation.result;
          } else {
            data = result;
          }
        } catch (error) {
          call.isError = true;
          throw error;
        }
      }
      return data;
    }
  );
  const { server } = fixtureApi;
  origin = fixtureApi.origin;
  return {
    server,
    origin,
    shareLink: `${origin}/builder/${projectId}?authToken=fixture-only-not-persisted`,
    getProject: () => stateToProject(state),
    getToolCalls: () => structuredClone(calls),
    close: fixtureApi.close,
  };
};
