import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  blockComponent,
  contentBlockDiagnostic,
  findParentInstanceReference,
  getAssetContentHash,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import { componentInsertResult } from "./component-insert-contract";
import { getRequiredComponentInsertData, insertFragment } from "./components";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import {
  blockTemplateNameConfirmationInput,
  instanceInsertModeInput,
  insertIndexInput,
} from "./instances";
import { materializeMdxAuthoredContent } from "./mdx-authored-content";
import { materializeMdxTemplates } from "./mdx-materialization";
import { resolveMdxTemplates } from "./mdx-template-resolution";
import type { BuilderRuntimeMutation } from "./mutation";

export const insertMdxTextInput = z.object({
  parentInstanceId: z.string().min(1),
  source: z.string().min(1),
  mode: instanceInsertModeInput.optional(),
  insertIndex: insertIndexInput.optional(),
  templateNameConfirmation: blockTemplateNameConfirmationInput.optional(),
});

export const mdxPasteResult = componentInsertResult.extend({
  diagnostics: z.array(contentBlockDiagnostic),
});

export type MdxPasteResult = z.infer<typeof mdxPasteResult>;

const findDestinationBlock = ({
  parentInstanceId,
  instances,
}: {
  parentInstanceId: Instance["id"];
  instances: WebstudioData["instances"];
}) => {
  let instance = instances.get(parentInstanceId);
  const visited = new Set<Instance["id"]>();
  while (instance !== undefined) {
    if (visited.has(instance.id)) {
      return;
    }
    visited.add(instance.id);
    if (instance.component === blockComponent) {
      return instance;
    }
    instance = findParentInstanceReference(instances, instance.id)?.instance;
  }
};

const createPasteIdentity = async ({
  blockInstanceId,
  parentInstanceId,
  source,
}: {
  blockInstanceId: Instance["id"];
  parentInstanceId: Instance["id"];
  source: string;
}): Promise<ContentBlockExternalContentIdentity> => ({
  blockInstanceId,
  assetId: "clipboard",
  revision: `sha256:${await getAssetContentHash(
    new TextEncoder().encode(source)
  )}`,
  contentRef: "clipboard.mdx",
  format: "mdx",
  renderScope: `paste:${parentInstanceId}`,
});

const parsePastedMdx = async (source: string) => {
  try {
    return await parseMdxDocument({ source });
  } catch {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Pasted text is not valid safe MDX."
    );
  }
};

export const insertMdxText = async ({
  state,
  input,
  context,
}: {
  state: BuilderState;
  input: z.infer<typeof insertMdxTextInput>;
  context: BuilderRuntimeContext;
}): Promise<BuilderRuntimeMutation<MdxPasteResult>> => {
  const data = getRequiredComponentInsertData(state);
  const destinationBlock = findDestinationBlock({
    parentInstanceId: input.parentInstanceId,
    instances: data.instances,
  });
  const identity = await createPasteIdentity({
    blockInstanceId: destinationBlock?.id ?? input.parentInstanceId,
    parentInstanceId: input.parentInstanceId,
    source: input.source,
  });
  const document = await parsePastedMdx(input.source);
  const resolution = resolveMdxTemplates({
    document,
    identity,
    instances: data.instances,
    metas: componentMetas,
  });
  const templateMaterialization = await materializeMdxTemplates({
    identity,
    resolution,
    data,
    metas: componentMetas,
    projectId: context.projectId ?? "",
  });
  const authored = materializeMdxAuthoredContent({
    identity,
    document,
    templateMaterialization,
  });
  const mutation = insertFragment(
    state,
    {
      parentInstanceId: input.parentInstanceId,
      fragment: authored.fragment,
      contentMode: destinationBlock !== undefined,
      mode: input.mode,
      insertIndex: input.insertIndex,
      templateNameConfirmation: input.templateNameConfirmation,
    },
    context
  );
  return {
    ...mutation,
    result: {
      ...mutation.result,
      parentInstanceId:
        mutation.result.parentInstanceId ?? input.parentInstanceId,
      diagnostics: [...templateMaterialization.diagnostics],
    },
  };
};
