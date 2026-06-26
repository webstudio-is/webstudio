import { nanoid } from "nanoid";
import type { CompactBuild } from "@webstudio-is/project-build";
import { executeBuilderRuntimeOperation } from "@webstudio-is/project-build/runtime/registry";
import { BuilderRuntimeError } from "@webstudio-is/project-build/runtime/errors";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime/mutation";
import type { BuilderState } from "@webstudio-is/project-build/state/builder-state";
import {
  createBuilderStateFromSnapshot,
  type BuilderStateSnapshot,
} from "@webstudio-is/project-build/state/adapters";
import { getStyleDeclKey, type Asset } from "@webstudio-is/sdk";
import { throwApiError } from "./api-errors.server";

const mapEntriesById = <Item extends { id: string }>(items: Item[]) =>
  items.map((item) => [item.id, item] as const);

const defaultBuilderRuntimeContext = {
  createId: nanoid,
  now: () => new Date(),
};

export const createBuilderRuntimeState = (
  build: CompactBuild,
  assets?: Asset[]
): BuilderState => {
  const snapshot = {
    pages: build.pages,
    breakpoints: mapEntriesById(build.breakpoints),
    styles: build.styles.map((styleDecl) => [
      getStyleDeclKey(styleDecl),
      styleDecl,
    ]),
    styleSources: mapEntriesById(build.styleSources),
    styleSourceSelections: build.styleSourceSelections.map((selection) => [
      selection.instanceId,
      selection,
    ]),
    props: mapEntriesById(build.props),
    dataSources: mapEntriesById(build.dataSources),
    resources: mapEntriesById(build.resources),
    instances: mapEntriesById(build.instances),
    assets: assets === undefined ? undefined : mapEntriesById(assets),
    marketplaceProduct: build.marketplaceProduct,
  } satisfies BuilderStateSnapshot;

  return createBuilderStateFromSnapshot(snapshot);
};

export const executeApiRuntimeOperation = <Result>({
  id,
  build,
  assets,
  input,
}: {
  id: string;
  build: CompactBuild;
  assets?: Asset[];
  input: unknown;
}): Result => {
  try {
    return executeBuilderRuntimeOperation<Result>({
      id,
      state: createBuilderRuntimeState(build, assets),
      input,
      context: defaultBuilderRuntimeContext,
    });
  } catch (error) {
    if (error instanceof BuilderRuntimeError) {
      return throwApiError(error.code, error.message);
    }
    throw error;
  }
};

export const executeApiRuntimeMutation = <
  Result extends Record<string, unknown> = Record<string, unknown>,
>(args: {
  id: string;
  build: CompactBuild;
  assets?: Asset[];
  input: unknown;
}) => executeApiRuntimeOperation<BuilderRuntimeMutation<Result>>(args);
