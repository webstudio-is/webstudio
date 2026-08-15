import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { toast } from "@webstudio-is/design-system";
import {
  decodeUtf8,
  readBoundedBytes,
} from "@webstudio-is/content-engine/compiler";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import { previewMarkdownToMdxConversion } from "@webstudio-is/content-engine/mdx-conversion";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import {
  contentBlockSourceProp,
  formatAssetName,
  formatContentBlockSourceIntegrityIssue,
  getFileNameParts,
  getContentBlockSourceIntegrityIssues,
  parseContentBlockSourceProp,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { TextFileEditor } from "~/builder/features/text-file-editor/text-file-editor";
import { createBuilderHttpAssetContentRepository } from "~/builder/shared/assets/mdx-content-repository";
import { uploadSingleAsset } from "~/builder/shared/assets/upload-assets";
import {
  $authPermit,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import {
  $assets,
  $instances,
  $project,
  $props,
} from "~/shared/sync/data-stores";
import { ContentBlockSourceControl } from "./content-block-source";
import { createBuilderContentBlockSourceController } from "./content-block-source-controller";

const getSource = (
  blockInstanceId: string,
  props: ReturnType<typeof $props.get>
) => {
  const sourceProps = Array.from(props.values()).filter(
    (prop) =>
      prop.instanceId === blockInstanceId &&
      prop.name === contentBlockSourceProp
  );
  return sourceProps.length === 1
    ? parseContentBlockSourceProp(sourceProps[0])
    : undefined;
};

const getStateError = (
  state: Awaited<
    ReturnType<
      ReturnType<typeof createBuilderContentBlockSourceController>["open"]
    >
  >
) => {
  if (state.status === "failed" || state.status === "recoverable") {
    return state.error.message;
  }
  if (state.status === "conflicting") {
    return "The MDX file changed remotely. Reload it before editing.";
  }
};

export const ContentBlockSourceSection = ({
  blockInstanceId,
  renderScope,
}: {
  blockInstanceId: string;
  renderScope: string;
}) => {
  const project = useStore($project);
  const props = useStore($props);
  const assets = useStore($assets);
  const instances = useStore($instances);
  const authPermit = useStore($authPermit);
  const variableValues = useStore($variableValuesByInstanceSelector);
  const source = useMemo(
    () => getSource(blockInstanceId, props),
    [blockInstanceId, props]
  );
  const resolvedAssetId =
    source?.type === "asset"
      ? source.assetId
      : source?.type === "expression"
        ? (() => {
            try {
              const value = computeExpression(
                source.value,
                variableValues.get(renderScope) ?? new Map()
              );
              return typeof value === "string" ? value : undefined;
            } catch {
              return;
            }
          })()
        : undefined;
  const resolvedAsset =
    resolvedAssetId === undefined ? undefined : assets.get(resolvedAssetId);
  const blockInstance = instances.get(blockInstanceId);
  const sourceIntegrityIssue =
    blockInstance === undefined
      ? undefined
      : getContentBlockSourceIntegrityIssues({
          instances: [blockInstance],
          props: props.values(),
          assets: assets.values(),
        })[0];
  const sourceIntegrityError =
    sourceIntegrityIssue === undefined
      ? undefined
      : formatContentBlockSourceIntegrityIssue(sourceIntegrityIssue);
  const [loading, setLoading] = useState(source !== undefined);
  const [error, setError] = useState<string>();
  const [openedAssetId, setOpenedAssetId] = useState<string>();
  const controller = useMemo(
    () =>
      project === undefined
        ? undefined
        : createBuilderContentBlockSourceController({
            blockInstanceId,
            renderScope,
            projectId: project.id,
          }),
    [blockInstanceId, project, renderScope]
  );
  const repository = useMemo(
    () =>
      project === undefined
        ? undefined
        : createBuilderHttpAssetContentRepository({ projectId: project.id }),
    [project]
  );

  useEffect(() => {
    let active = true;
    if (source === undefined || controller === undefined) {
      setLoading(false);
      setError(undefined);
      return;
    }
    setLoading(true);
    void controller
      .open(source)
      .then((state) => {
        if (active) {
          setError(getStateError(state));
          const warningCount = state.diagnostics.filter(
            (diagnostic) => diagnostic.severity === "warning"
          ).length;
          if (warningCount > 0) {
            toast.warn(
              `The MDX file has ${warningCount} content ${warningCount === 1 ? "warning" : "warnings"}.`
            );
          }
        }
      })
      .catch((error) => {
        if (active) {
          setError(
            error instanceof Error ? error.message : "Unable to load MDX"
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [
    controller,
    resolvedAsset?.name,
    resolvedAsset?.size,
    resolvedAsset?.updatedAt,
    resolvedAssetId,
    source,
  ]);

  useEffect(
    () => () => {
      controller?.dispose();
    },
    [controller]
  );

  if (
    project === undefined ||
    controller === undefined ||
    repository === undefined
  ) {
    return;
  }

  const requestSource = async (input: {
    source: ContentBlockSource;
    authority?: Parameters<typeof controller.requestSource>[0]["authority"];
  }) => {
    const result = await controller.requestSource(input);
    if (result.status === "applied") {
      setError(
        result.state === undefined ? undefined : getStateError(result.state)
      );
    }
    return result;
  };

  return (
    <>
      <ContentBlockSourceControl
        source={source}
        resolvedAsset={resolvedAsset}
        disabled={authPermit === "view"}
        loading={loading}
        error={error ?? sourceIntegrityError}
        onRequestSource={requestSource}
        onDisconnect={async () => {
          const result = await controller.disconnect();
          return result.status === "requires-authority"
            ? {
                status: "blocked",
                message: "Disconnect does not accept a content authority.",
              }
            : result;
        }}
        onOpen={setOpenedAssetId}
        onPreviewMarkdown={async (assetId) => {
          const content = await repository.readContent({ assetId });
          const bytes = await readBoundedBytes(
            content.data,
            contentEngineLimits.hydratedFileBytes
          );
          if (bytes.byteLength !== content.asset.size) {
            throw new Error("Markdown Asset content does not match its size");
          }
          return await previewMarkdownToMdxConversion({
            source: decodeUtf8(bytes),
          });
        }}
        onCreateConvertedMdx={async ({ assetId, preview }) => {
          const markdownAsset = assets.get(assetId);
          if (markdownAsset === undefined) {
            throw new Error("Markdown Asset not found");
          }
          const { basename } = getFileNameParts(formatAssetName(markdownAsset));
          const created = await uploadSingleAsset(
            "file",
            new File([preview.source], `${basename}.mdx`, {
              type: "text/mdx",
            }),
            { folderId: markdownAsset.folderId }
          );
          return created?.id;
        }}
      />
      {openedAssetId !== undefined && (
        <TextFileEditor
          key={openedAssetId}
          assetId={openedAssetId}
          onOpenChange={(open) => {
            if (open === false) {
              setOpenedAssetId(undefined);
            }
          }}
        />
      )}
    </>
  );
};
