import type { CompactBuild } from "@webstudio-is/project-build";
import type { RuntimeOperationId } from "@webstudio-is/project-build/contracts/builder-runtime";
import { executeBuilderRuntimeOperation } from "@webstudio-is/project-build/runtime/registry";
import { BuilderRuntimeError } from "@webstudio-is/project-build/runtime/errors";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime/mutation";
import type { BuilderState } from "@webstudio-is/project-build/state/builder-state";
import { createBuilderStateFromCompactBuild } from "@webstudio-is/project-build/state/adapters";
import { type Asset } from "@webstudio-is/sdk";
import { throwApiError } from "./api-errors.server";

export const createBuilderRuntimeState = (
  build: CompactBuild,
  assets?: Asset[]
): BuilderState =>
  createBuilderStateFromCompactBuild(
    assets === undefined ? build : { ...build, assets }
  );

export const executeApiRuntimeOperation = async <Result>({
  id,
  build,
  assets,
  input,
}: {
  id: RuntimeOperationId;
  build: CompactBuild;
  assets?: Asset[];
  input: unknown;
}): Promise<Result> => {
  try {
    return await executeBuilderRuntimeOperation<Result>({
      id,
      state: createBuilderRuntimeState(build, assets),
      input,
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
  id: RuntimeOperationId;
  build: CompactBuild;
  assets?: Asset[];
  input: unknown;
}) => executeApiRuntimeOperation<BuilderRuntimeMutation<Result>>(args);
