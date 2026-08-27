import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { parseMdxDocumentRecovering } from "@webstudio-is/content-engine/mdx";
import { Grid, Label, Text } from "@webstudio-is/design-system";
import {
  contentBlockSourceProp,
  getContentBlockSource,
} from "@webstudio-is/sdk";
import { TextFileEditor } from "~/builder/features/text-file-editor/text-file-editor";
import {
  $authPermit,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import type { AssetContentSessionState } from "@webstudio-is/content-engine/asset-content-session";
import {
  $assets,
  $instances,
  $project,
  $props,
} from "~/shared/sync/data-stores";
import {
  retryExternalContentAsset,
  subscribeExternalContentAsset,
} from "~/shared/external-content-roots";
import {
  $externalContentRoots,
  findExternalContentRoot,
} from "~/shared/external-content-mutations";
import { ContentBlockSourceControl } from "./content-block-source";
import { createBuilderContentBlockSourceController } from "./content-block-source-controller";
import { CodeEditor } from "~/shared/code-editor";
import {
  isRepeatedContentBlockOccurrence,
  parseContentBlockRenderScope,
  resolveContentBlockOccurrenceAssetId,
} from "~/shared/content-block-source-utils";
import { PropertyLabel } from "../property-label";
import { VerticalLayout } from "../shared";

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
  const externalContentRoots = useStore($externalContentRoots);
  const source = useMemo(
    () => getContentBlockSource({ blockInstanceId, props: props.values() }),
    [blockInstanceId, props]
  );
  const instanceSelector = useMemo(
    () => parseContentBlockRenderScope(renderScope),
    [renderScope]
  );
  const resolvedAssetId = useMemo(() => {
    if (source === undefined || instanceSelector === undefined) {
      return;
    }
    return resolveContentBlockOccurrenceAssetId({
      source,
      instanceSelector,
      variableValuesByRenderScope: variableValues,
    });
  }, [instanceSelector, source, variableValues]);
  const resolvedAsset =
    resolvedAssetId === undefined ? undefined : assets.get(resolvedAssetId);
  const repeatedRenderScope =
    instanceSelector === undefined
      ? false
      : isRepeatedContentBlockOccurrence({ instanceSelector, instances });
  const [loading, setLoading] = useState(source !== undefined);
  const [error, setError] = useState<string>();
  const [frontmatterSource, setFrontmatterSource] = useState<string>();
  const [frontmatterError, setFrontmatterError] = useState<string>();
  const frontmatterSourceRef = useRef<string>();
  const frontmatterDirtyRef = useRef(false);
  const [openedAssetId, setOpenedAssetId] = useState<string>();
  const [disconnecting, setDisconnecting] = useState(false);
  const [contentState, setContentState] = useState<AssetContentSessionState>();
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
  useEffect(() => {
    let active = true;
    if (source === undefined || controller === undefined) {
      setLoading(false);
      setError(undefined);
      setFrontmatterSource(undefined);
      setFrontmatterError(undefined);
      frontmatterSourceRef.current = undefined;
      frontmatterDirtyRef.current = false;
      return;
    }
    setLoading(true);
    void controller
      .open(source)
      .then(async (state) => {
        if (active === false) {
          return;
        }
        setError(undefined);
        const parsed = await parseMdxDocumentRecovering({
          source: state.source,
        });
        if (active && parsed.status === "parsed") {
          const value = JSON.stringify(
            parsed.document.frontmatter.properties,
            null,
            2
          );
          if (frontmatterDirtyRef.current === false) {
            frontmatterSourceRef.current = value;
            setFrontmatterSource(value);
          }
        }
      })
      .catch(
        (error) =>
          active &&
          setError(
            error instanceof Error ? error.message : "Unable to load MDX"
          )
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [controller, resolvedAsset?.name, resolvedAsset?.size, source]);

  useEffect(() => {
    if (project === undefined || resolvedAssetId === undefined) {
      setContentState(undefined);
      return;
    }
    return subscribeExternalContentAsset({
      projectId: project.id,
      assetId: resolvedAssetId,
      listener: setContentState,
    });
  }, [project, resolvedAssetId]);

  if (project === undefined || controller === undefined) {
    return;
  }
  const externalContentRoot = findExternalContentRoot(
    externalContentRoots,
    blockInstanceId,
    renderScope
  );

  return (
    <VerticalLayout
      label={
        <PropertyLabel
          name={contentBlockSourceProp}
          deletable={authPermit !== "view"}
          onDelete={() => setDisconnecting(true)}
        />
      }
    >
      <ContentBlockSourceControl
        source={source}
        resolvedAsset={resolvedAsset}
        disabled={authPermit === "view"}
        loading={loading}
        error={error}
        diagnostics={externalContentRoot?.diagnostics}
        revision={externalContentRoot?.identity?.revision}
        persistenceStatus={contentState?.status}
        persistenceError={contentState?.error?.message}
        repeatedRenderScope={repeatedRenderScope}
        disconnecting={disconnecting}
        onDisconnectingChange={setDisconnecting}
        onRetry={
          resolvedAssetId === undefined
            ? undefined
            : async () => {
                await retryExternalContentAsset({
                  projectId: project.id,
                  assetId: resolvedAssetId,
                });
              }
        }
        onRequestSource={controller.requestSource}
        onDisconnect={controller.disconnect}
        onOpen={setOpenedAssetId}
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
            readOnly={authPermit === "view" || loading}
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
              try {
                await controller.saveFrontmatter(
                  properties as Record<string, unknown>
                );
              } catch (error) {
                setFrontmatterError(
                  error instanceof Error
                    ? error.message
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
          onOpenChange={(open) => open === false && setOpenedAssetId(undefined)}
        />
      )}
    </VerticalLayout>
  );
};
