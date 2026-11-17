import { isDescendantOrSelf } from "@webstudio-is/project-build/runtime";
import {
  includeMdxAssetDependencies as discoverMdxAssetDependencies,
  prepareConnectedContentBlockFragment as prepareContentBlockFragment,
} from "@webstudio-is/project-build/transfer";
import {
  contentBlockSourceProp,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import {
  getExternalContentRootAssets,
  openExternalContentAsset,
} from "../external-content-roots";

export const resolveRepeatedContentBlockSourcesForCopy = ({
  fragment,
  selectedInstanceSelector,
  occurrences,
}: {
  fragment: WebstudioFragment;
  selectedInstanceSelector: readonly string[];
  occurrences: ReadonlyArray<
    Readonly<{
      sourceBlockInstanceId: string;
      sourceRenderScope: string;
      sourceInstanceSelector: readonly string[];
      assetId: string;
    }>
  >;
}) => {
  const selectedOccurrences = occurrences.filter(({ sourceInstanceSelector }) =>
    isDescendantOrSelf(
      [...sourceInstanceSelector],
      [...selectedInstanceSelector]
    )
  );
  const occurrencesByBlockId = new Map<string, typeof selectedOccurrences>();
  for (const occurrence of selectedOccurrences) {
    const blockOccurrences =
      occurrencesByBlockId.get(occurrence.sourceBlockInstanceId) ?? [];
    blockOccurrences.push(occurrence);
    occurrencesByBlockId.set(
      occurrence.sourceBlockInstanceId,
      blockOccurrences
    );
  }
  return {
    fragment: {
      ...fragment,
      props: fragment.props.map((prop) => {
        const blockOccurrences = occurrencesByBlockId.get(prop.instanceId);
        if (
          prop.name !== contentBlockSourceProp ||
          prop.type !== "expression" ||
          blockOccurrences?.length !== 1
        ) {
          return prop;
        }
        return {
          ...prop,
          type: "asset" as const,
          value: blockOccurrences[0].assetId,
        };
      }),
    },
    renderScopes: new Set(
      selectedOccurrences.map(({ sourceRenderScope }) => sourceRenderScope)
    ),
  };
};

export const prepareConnectedContentBlockFragment = ({
  projectId,
  renderScopes,
  ...input
}: Omit<
  Parameters<typeof prepareContentBlockFragment>[0],
  "getRenderedAssets"
> & {
  projectId: string | undefined;
  renderScopes?: ReadonlySet<string>;
}) =>
  prepareContentBlockFragment({
    ...input,
    getRenderedAssets:
      projectId === undefined
        ? undefined
        : (blockInstanceIds) =>
            getExternalContentRootAssets({
              projectId,
              blockInstanceIds,
              renderScopes,
            }),
  });

export const includeMdxAssetDependencies = ({
  projectId,
  readSource = async (assetId: string) =>
    (await openExternalContentAsset({ projectId, assetId })).source,
  ...input
}: Omit<Parameters<typeof discoverMdxAssetDependencies>[0], "readSource"> & {
  projectId: string;
  readSource?: (assetId: string) => Promise<string>;
}) => discoverMdxAssetDependencies({ ...input, readSource });
