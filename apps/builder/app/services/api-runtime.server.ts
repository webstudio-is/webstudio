import { nanoid } from "nanoid";
import type { CompactBuild } from "@webstudio-is/project-build";
import { executeBuilderRuntimeOperation } from "@webstudio-is/project-build/runtime/registry";
import { BuilderRuntimeError } from "@webstudio-is/project-build/runtime/errors";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime/mutation";
import type { BuilderState } from "@webstudio-is/project-build/state/builder-state";
import { createBuilderStateFromCompactBuild } from "@webstudio-is/project-build/state/adapters";
import { type Asset } from "@webstudio-is/sdk";
import { throwApiError } from "./api-errors.server";

const defaultBuilderRuntimeContext = {
  createId: nanoid,
  now: () => new Date(),
};

export const createBuilderRuntimeState = (
  build: CompactBuild,
  assets?: Asset[]
): BuilderState => createBuilderStateFromCompactBuild({ ...build, assets });

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
