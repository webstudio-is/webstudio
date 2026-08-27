import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
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
import { $assets, $project, $props } from "~/shared/sync/data-stores";
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
import {
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
  const [loading, setLoading] = useState(source !== undefined);
  const [error, setError] = useState<string>();
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
      return;
    }
    setLoading(true);
    void controller
      .open(source)
      .then(() => {
        if (active === false) {
          return;
        }
        setError(undefined);
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
          onDelete={() => {
            if (disconnecting) {
              return;
            }
            setDisconnecting(true);
            setError(undefined);
            void controller
              .disconnect()
              .then((result) => {
                if (result.status === "blocked") {
                  setError(result.message);
                }
              })
              .catch((error) =>
                setError(
                  error instanceof Error
                    ? error.message
                    : "Unable to disconnect source"
                )
              )
              .finally(() => setDisconnecting(false));
          }}
        />
      }
    >
      <ContentBlockSourceControl
        source={source}
        resolvedAsset={resolvedAsset}
        disabled={authPermit === "view" || disconnecting}
        loading={loading}
        error={error}
        diagnostics={externalContentRoot?.diagnostics}
        persistenceStatus={contentState?.status}
        persistenceError={contentState?.error?.message}
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
        onOpen={setOpenedAssetId}
      />
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
