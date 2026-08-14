import hash from "@emotion/hash";
import type {
  ContentBlockExternalContentIdentity,
  WebstudioData,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import { findAvailableVariables } from "./data";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./fragment";
import type {
  MdxTemplateReference,
  MdxTemplateResolution,
} from "./mdx-template-resolution";

export type MaterializedMdxTemplate = Readonly<{
  reference: Extract<MdxTemplateReference, { type: "resolved-template" }>;
  fragment: WebstudioFragment;
}>;

const createEmptyFragmentData = (): Omit<WebstudioData, "pages"> => ({
  instances: new Map(),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

const createScopeIdGenerator = ({
  identity,
  path,
}: {
  identity: ContentBlockExternalContentIdentity;
  path: readonly number[];
}) => {
  const scope = hash(
    JSON.stringify([
      identity.blockInstanceId,
      identity.assetId,
      identity.revision,
      identity.contentRef,
      identity.renderScope,
      path,
    ])
  );
  let index = 0;
  return () => `mdx-${scope}-${index++}`;
};

export const materializeMdxTemplates = ({
  identity,
  resolution,
  data,
  projectId,
}: {
  identity: ContentBlockExternalContentIdentity;
  resolution: MdxTemplateResolution;
  data: Omit<WebstudioData, "pages">;
  projectId: string;
}): readonly MaterializedMdxTemplate[] => {
  const materializedTemplates: MaterializedMdxTemplate[] = [];
  for (const reference of resolution.references) {
    if (reference.type === "unresolved-template") {
      continue;
    }
    if (data.instances.has(reference.templateInstanceId) === false) {
      throw new Error(
        `Resolved MDX template instance "${reference.templateInstanceId}" is missing`
      );
    }

    const sourceFragment = extractWebstudioFragment(
      data,
      reference.templateInstanceId
    );
    const materializedData = createEmptyFragmentData();
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data: materializedData,
      fragment: sourceFragment,
      availableVariables: findAvailableVariables({
        startingInstanceId: reference.templateInstanceId,
        instances: data.instances,
        dataSources: data.dataSources,
      }),
      projectId,
      createId: createScopeIdGenerator({ identity, path: reference.path }),
    });
    const materializedRootId = newInstanceIds.get(reference.templateInstanceId);
    if (materializedRootId === undefined) {
      throw new Error(
        `Materialized MDX template instance "${reference.templateInstanceId}" is missing`
      );
    }

    materializedTemplates.push({
      reference,
      fragment: extractWebstudioFragment(materializedData, materializedRootId),
    });
  }
  return materializedTemplates;
};
