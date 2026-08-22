import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { readAssetContentBytes } from "@webstudio-is/asset-uploader/content-repository";
import { decodeUtf8 } from "@webstudio-is/content-engine/compiler";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import { previewMarkdownToMdxConversion } from "@webstudio-is/content-engine/mdx-conversion";
import { getContentBlockRenderScopeKey } from "@webstudio-is/project-build/runtime";
import { Grid, Label, Text } from "@webstudio-is/design-system";
import {
  formatAssetName,
  formatContentBlockSourceIntegrityIssue,
  getFileNameParts,
  getContentBlockSourceIntegrityIssues,
  getContentBlockSource,
  isEqualContentBlockSource,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { TextFileEditor } from "~/builder/features/text-file-editor/text-file-editor";
import { createBuilderHttpAssetContentRepository } from "~/builder/shared/assets/builder-mdx-content-repository.client";
import { uploadSingleAsset } from "~/builder/shared/assets/upload-assets";
import { $authPermit } from "~/shared/nano-states";
import {
  $assets,
  $instances,
  $project,
  $props,
} from "~/shared/sync/data-stores";
import { ContentBlockSourceControl } from "./content-block-source";
import { createBuilderContentBlockSourceController } from "./content-block-source-controller";
import {
  $materializedContentViewStates,
  formatContentBlockDiagnostic,
} from "~/shared/content-block-content";
import { $publisher } from "~/shared/pubsub";
import { CodeEditor } from "~/shared/code-editor";

const getSource = (
  blockInstanceId: string,
  props: ReturnType<typeof $props.get>
) => {
  return getContentBlockSource({ blockInstanceId, props: props.values() });
};

const getStateError = (
  state: Awaited<
    ReturnType<
      ReturnType<typeof createBuilderContentBlockSourceController>["open"]
    >
  >
) => {
  if (state.status === "failed" || state.status === "recoverable") {
    return state.diagnostics[0] === undefined
      ? "The MDX file could not be loaded."
      : formatContentBlockDiagnostic(state.diagnostics[0]);
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
  const materializedViewStates = useStore($materializedContentViewStates);
  const viewState = materializedViewStates.get(
    getContentBlockRenderScopeKey(blockInstanceId, renderScope)
  );
  const source = useMemo(
    () => getSource(blockInstanceId, props),
    [blockInstanceId, props]
  );
  const resolvedAssetId =
    source?.type === "asset"
      ? source.assetId
      : (viewState?.identity?.assetId ?? viewState?.assetId);
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
  const [sourceUpdating, setSourceUpdating] = useState(false);
  const [error, setError] = useState<string>();
  const [frontmatterSource, setFrontmatterSource] = useState<string>();
  const [frontmatterError, setFrontmatterError] = useState<string>();
  const frontmatterSourceRef = useRef<string>();
  const frontmatterAssetIdRef = useRef<string>();
  const frontmatterDirtyRef = useRef(false);
  const [openedAssetId, setOpenedAssetId] = useState<string>();
  const frontmatterReadOnly =
    authPermit === "view" ||
    loading ||
    sourceUpdating ||
    (viewState?.status !== "ready" && viewState?.status !== "empty");
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
      setFrontmatterSource(undefined);
      setFrontmatterError(undefined);
      frontmatterSourceRef.current = undefined;
      frontmatterAssetIdRef.current = undefined;
      frontmatterDirtyRef.current = false;
      return;
    }
    setLoading(true);
    void controller
      .open(source)
      .then((state) => {
        if (active) {
          setError(getStateError(state));
          if ("root" in state && "identity" in state) {
            const source = JSON.stringify(
              state.root.document.frontmatter.properties,
              null,
              2
            );
            if (
              frontmatterAssetIdRef.current !== state.identity.assetId ||
              frontmatterDirtyRef.current === false
            ) {
              frontmatterSourceRef.current = source;
              frontmatterDirtyRef.current = false;
              setFrontmatterSource(source);
            }
            frontmatterAssetIdRef.current = state.identity.assetId;
          }
        }
      })
      .catch(() => {
        if (active) {
          setError("Unable to load MDX");
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
    confirmed?: Parameters<typeof controller.requestSource>[0]["confirmed"];
  }) => {
    const isSwitch = source !== undefined;
    const sourceChanged =
      isEqualContentBlockSource(source, input.source) === false;
    const publishStatus = (status: "loading" | "ready") => {
      if (isSwitch) {
        $publisher.get().publish?.({
          type: "contentBlockSourceStatus",
          payload: {
            projectId: project.id,
            blockInstanceId,
            renderScope,
            status,
          },
        });
      }
    };
    publishStatus("loading");
    setSourceUpdating(true);
    try {
      const result = await controller.requestSource(input);
      if (result.status === "applied") {
        setError(
          result.state === undefined ? undefined : getStateError(result.state)
        );
        if (sourceChanged === false) {
          publishStatus("ready");
        }
      } else {
        publishStatus("ready");
      }
      return result;
    } catch (error) {
      publishStatus("ready");
      throw error;
    } finally {
      setSourceUpdating(false);
    }
  };

  return (
    <>
      <ContentBlockSourceControl
        source={source}
        resolvedAsset={resolvedAsset}
        disabled={authPermit === "view"}
        loading={loading}
        error={error ?? sourceIntegrityError}
        diagnostics={viewState?.diagnostics}
        onRequestSource={requestSource}
        onDisconnect={async () => {
          setSourceUpdating(true);
          try {
            const result = await controller.disconnect();
            return result.status === "requires-confirmation"
              ? {
                  status: "blocked",
                  message: "Disconnect confirmation is handled by the dialog.",
                }
              : result;
          } finally {
            setSourceUpdating(false);
          }
        }}
        onOpen={setOpenedAssetId}
        onPreviewMarkdown={async (assetId) => {
          const { bytes } = await readAssetContentBytes({
            repository,
            assetId,
            maxSize: contentEngineLimits.hydratedFileBytes,
          });
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
            { folderId: markdownAsset.folderId, deduplicate: false }
          );
          return created?.id;
        }}
      />
      {source !== undefined && frontmatterSource !== undefined && (
        <Grid gap="2">
          <Label>Frontmatter</Label>
          <Text color="subtle" variant="tiny">
            Edit the complete frontmatter object as JSON.
          </Text>
          <CodeEditor
            title="Frontmatter"
            lang="json"
            size="small"
            readOnly={frontmatterReadOnly}
            value={frontmatterSource}
            onChange={(value) => {
              frontmatterSourceRef.current = value;
              frontmatterDirtyRef.current = true;
              setFrontmatterSource(value);
              setFrontmatterError(undefined);
            }}
            onChangeComplete={async (value) => {
              let properties: unknown;
              try {
                properties = JSON.parse(value);
              } catch {
                setFrontmatterError("Frontmatter must be valid JSON.");
                return;
              }
              if (
                typeof properties !== "object" ||
                properties === null ||
                Array.isArray(properties)
              ) {
                setFrontmatterError("Frontmatter must be a JSON object.");
                return;
              }
              const result = await controller.saveFrontmatter(
                properties as Record<string, unknown>
              );
              if (result.status !== "applied") {
                setFrontmatterError(
                  "message" in result
                    ? result.message
                    : "Frontmatter could not be saved."
                );
                return;
              }
              if (frontmatterSourceRef.current === value) {
                frontmatterDirtyRef.current = false;
              }
            }}
          />
          {frontmatterError !== undefined && (
            <Text role="alert" color="destructive" variant="tiny">
              {frontmatterError}
            </Text>
          )}
        </Grid>
      )}
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
