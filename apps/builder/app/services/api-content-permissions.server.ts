import type { z } from "zod";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import type { CompactBuild } from "@webstudio-is/project-build";
import {
  applyContentModeTransaction,
  getContentModeCapabilities,
} from "@webstudio-is/project-build/runtime";
import type { buildPatchTransaction } from "@webstudio-is/protocol/schema";
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
  scope = "content",
}: {
  auth: Awaited<ReturnType<typeof assertApiProjectPermit>>;
  build: CompactBuild;
  transactions: z.infer<typeof buildPatchTransaction>[];
  scope?: "content" | "text-and-props";
}) => {
  if (auth.permits.includes("build")) {
    return;
  }
  if (transactions.length > 10) {
    throw new AuthorizationError(
      "You don't have permission to build this project."
    );
  }
  let capabilities = createContentModeCapabilitiesFromBuild(build);
  for (const transaction of transactions) {
    const result = applyContentModeTransaction({
      capabilities,
      transaction,
      scope,
    });
    if (result.success === false) {
      throw new AuthorizationError(result.error);
    }
    capabilities = result.capabilities;
  }
};
