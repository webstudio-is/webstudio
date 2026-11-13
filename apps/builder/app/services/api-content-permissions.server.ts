import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { CompactBuild } from "@webstudio-is/project-build";
import {
  applyContentModeTransaction,
  getContentModeCapabilities,
} from "@webstudio-is/project-build/runtime";
import type { buildPatchTransaction } from "@webstudio-is/protocol/schema";
import type { AssetFolder } from "@webstudio-is/sdk";
import { componentMetas } from "~/shared/component-metas.server";
import type { assertApiProjectPermit } from "./api-permits.server";
import { createBuilderRuntimeState } from "./api-runtime.server";

const createContentModeCapabilitiesFromBuild = (build: CompactBuild) => {
  const state = createBuilderRuntimeState(build);
  return getContentModeCapabilities({
    instances: state.instances!,
    metas: componentMetas,
    props: state.props!,
    styleSources: state.styleSources!,
    styleSourceSelections: state.styleSourceSelections,
    styles: state.styles,
    breakpoints: state.breakpoints,
  });
};

export const assertContentOrBuildTransactions = ({
  auth,
  build,
  transactions,
  assetFolders,
  scope = "content",
}: {
  auth: Awaited<ReturnType<typeof assertApiProjectPermit>>;
  build: CompactBuild;
  transactions: z.infer<typeof buildPatchTransaction>[];
  assetFolders?: readonly AssetFolder[];
  scope?: "content" | "text-and-props";
}) => {
  if (auth.permits.includes("build")) {
    return;
  }
  if (
    transactions.length > 10 ||
    transactions.reduce((count, { payload }) => count + payload.length, 0) >
      100 ||
    transactions.reduce(
      (count, { payload }) =>
        count +
        payload.reduce((count, { patches }) => count + patches.length, 0),
      0
    ) > 1000
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to build this project.",
    });
  }
  let capabilities = createContentModeCapabilitiesFromBuild(build);
  if (assetFolders !== undefined) {
    capabilities.assetFolders = new Map(
      assetFolders.map((folder) => [folder.id, folder])
    );
  }
  for (const transaction of transactions) {
    const result = applyContentModeTransaction({
      capabilities,
      transaction,
      scope,
    });
    if (result.success === false) {
      throw new TRPCError({ code: "FORBIDDEN", message: result.error });
    }
    capabilities = result.capabilities;
  }
};
