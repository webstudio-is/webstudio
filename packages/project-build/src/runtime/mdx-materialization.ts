import hash from "@emotion/hash";
import type {
  ContentBlockExternalContentIdentity,
  Instance,
  WebstudioData,
  WebstudioFragment,
} from "@webstudio-is/sdk";
import { findAvailableVariables } from "./data";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  mapFragmentChildrenToCopiedChildren,
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

const toFragment = ({
  children,
  data,
}: {
  children: Instance["children"];
  data: Omit<WebstudioData, "pages">;
}): WebstudioFragment => ({
  children,
  instances: Array.from(data.instances.values()),
  props: Array.from(data.props.values()),
  dataSources: Array.from(data.dataSources.values()),
  resources: Array.from(data.resources.values()),
  styleSources: Array.from(data.styleSources.values()),
  styleSourceSelections: Array.from(data.styleSourceSelections.values()),
  styles: Array.from(data.styles.values()),
  breakpoints: Array.from(data.breakpoints.values()),
  assets: Array.from(data.assets.values()),
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

    materializedTemplates.push({
      reference,
      fragment: toFragment({
        children: mapFragmentChildrenToCopiedChildren({
          children: sourceFragment.children,
          newInstanceIds,
        }),
        data: materializedData,
      }),
    });
  }
  return materializedTemplates;
};
