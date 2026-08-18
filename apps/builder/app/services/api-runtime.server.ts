import type { CompactBuild } from "@webstudio-is/project-build";
import type { RuntimeOperationId } from "@webstudio-is/project-build/contracts";
import { executeBuilderRuntimeOperation } from "@webstudio-is/project-build/runtime";
import { BuilderRuntimeError } from "@webstudio-is/project-build/runtime";
import { builderRuntimeContext } from "@webstudio-is/project-build/runtime";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime";
import type { BuilderState } from "@webstudio-is/project-build/state";
import { createBuilderStateFromCompactBuild } from "@webstudio-is/project-build/state";
import { type Asset, type AssetFolder } from "@webstudio-is/sdk";
import { throwApiError } from "./api-errors.server";

export const createBuilderRuntimeState = (
  build: CompactBuild,
  assets?: Asset[],
  assetFolders?: AssetFolder[]
): BuilderState =>
  createBuilderStateFromCompactBuild(
    assets === undefined && assetFolders === undefined
      ? build
      : { ...build, assets, assetFolders }
  );

export const executeApiRuntimeOperation = async <Result>({
  id,
  build,
  assets,
  assetFolders,
  input,
}: {
  id: RuntimeOperationId;
  build: CompactBuild;
  assets?: Asset[];
  assetFolders?: AssetFolder[];
  input: unknown;
}): Promise<Result> => {
  try {
    return await executeBuilderRuntimeOperation<Result>({
      id,
      state: createBuilderRuntimeState(build, assets, assetFolders),
      input,
      context: {
        createId: builderRuntimeContext.createId,
        projectId: build.projectId,
        projectVersion: build.version,
      },
    });
  } catch (error) {
    if (error instanceof BuilderRuntimeError) {
      return throwApiError(
        error.code === "INVALID_INPUT" ? "BAD_REQUEST" : error.code,
        error.message,
        {
          webstudioCode: error.code,
          issues: error.issues,
        }
      );
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
  assetFolders?: AssetFolder[];
  input: unknown;
}) => executeApiRuntimeOperation<BuilderRuntimeMutation<Result>>(args);
