import { useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Flex,
  Grid,
  Text,
  theme,
} from "@webstudio-is/design-system";
import {
  formatAssetName,
  type Asset,
  type ContentBlockDiagnostic,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { useBindableControl } from "./use-bindable-control";
import { SelectAsset } from "./select-asset";
import {
  deduplicateContentBlockDiagnostics,
  formatContentBlockDiagnostic,
} from "~/shared/content-block-diagnostics";

type ContentBlockSourceMutationResult =
  | Readonly<{ status: "applied" }>
  | Readonly<{ status: "partial"; message: string }>
  | Readonly<{ status: "blocked"; message: string }>;

type ContentBlockSourceActionResult =
  | ContentBlockSourceMutationResult
  | Readonly<{
      status: "requires-confirmation";
      diagnostics?: readonly ContentBlockDiagnostic[];
    }>;

type PendingSource = Readonly<{
  source: ContentBlockSource;
  diagnostics: readonly ContentBlockDiagnostic[];
}>;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const ConnectSourceDialog = ({
  disabled,
  error,
  diagnostics,
  onClose,
  onConfirm,
}: {
  disabled: boolean;
  error?: string;
  diagnostics: readonly ContentBlockDiagnostic[];
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open onOpenChange={(open) => open === false && onClose()}>
    <DialogContent>
      <DialogTitle>Connect content source</DialogTitle>
      <DialogDescription asChild>
        <Text css={{ padding: theme.panel.padding }}>
          Connecting this file will replace the existing Content Block content.
          The MDX file will not be changed.
        </Text>
      </DialogDescription>
      {error !== undefined && (
        <Text
          role="alert"
          color="destructive"
          variant="tiny"
          css={{
            paddingInline: theme.panel.paddingInline,
            paddingBottom: theme.panel.paddingBlock,
          }}
        >
          {error}
        </Text>
      )}
      {diagnostics.map((diagnostic) => (
        <Text
          key={JSON.stringify(diagnostic)}
          role="status"
          color="subtle"
          variant="tiny"
          css={{ paddingInline: theme.panel.paddingInline }}
        >
          {formatContentBlockDiagnostic(diagnostic)}
        </Text>
      ))}
      <DialogActions>
        <Button disabled={disabled} onClick={onConfirm}>
          Connect
        </Button>
        <DialogClose>
          <Button autoFocus color="ghost" disabled={disabled}>
            Abort
          </Button>
        </DialogClose>
      </DialogActions>
    </DialogContent>
  </Dialog>
);

const DisconnectDialog = ({
  disabled,
  error,
  repeatedRenderScope,
  onClose,
  onConfirm,
}: {
  disabled: boolean;
  error?: string;
  repeatedRenderScope: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open onOpenChange={(open) => open === false && onClose()}>
    <DialogContent>
      <DialogTitle>Disconnect content source</DialogTitle>
      <Grid gap="3" css={{ padding: theme.panel.padding }}>
        <DialogDescription asChild>
          <Text>
            {repeatedRenderScope
              ? "This source binding is shared by every Collection item. The selected item’s file content will become the ordinary Content Block content used by every item. The file will not be changed."
              : "The current file content will be copied into the Content Block. The file will not be changed."}
          </Text>
        </DialogDescription>
        {error !== undefined && (
          <Text role="alert" color="destructive" variant="tiny">
            {error}
          </Text>
        )}
      </Grid>
      <DialogActions>
        <Button autoFocus disabled={disabled} onClick={onConfirm}>
          Confirm
        </Button>
        <DialogClose>
          <Button color="ghost" disabled={disabled}>
            Abort
          </Button>
        </DialogClose>
      </DialogActions>
    </DialogContent>
  </Dialog>
);

/**
 * Presentation and interaction boundary for Content Block source lifecycle.
 * The caller owns loading, exact-Asset authorization, lifecycle preparation,
 * and persistence. This component never updates the src prop directly.
 */
export const ContentBlockSourceControl = ({
  source,
  resolvedAsset,
  disabled = false,
  loading = false,
  error,
  diagnostics = [],
  revision,
  persistenceStatus,
  persistenceError,
  repeatedRenderScope = false,
  disconnecting,
  onDisconnectingChange,
  onRetry,
  onRequestSource,
  onDisconnect,
  onOpen,
}: {
  source?: ContentBlockSource;
  resolvedAsset?: Asset;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  diagnostics?: readonly ContentBlockDiagnostic[];
  revision?: string;
  persistenceStatus?: "saved" | "pending" | "saving" | "failed" | "conflicting";
  persistenceError?: string;
  repeatedRenderScope?: boolean;
  disconnecting: boolean;
  onDisconnectingChange: (disconnecting: boolean) => void;
  onRetry?: () => Promise<void>;
  onRequestSource: (input: {
    source: ContentBlockSource;
    confirmed?: boolean;
  }) => Promise<ContentBlockSourceActionResult>;
  onDisconnect: () => Promise<ContentBlockSourceMutationResult>;
  onOpen: (assetId: string) => void;
}) => {
  const [pendingSource, setPendingSource] = useState<PendingSource>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [localError, setLocalError] = useState<string>();
  const isDisabled = disabled || loading || busy;
  const connected = source !== undefined;
  const binding = useBindableControl({
    boundExpression: source?.type === "expression" ? source.value : undefined,
    fallbackExpression: JSON.stringify(resolvedAsset?.id ?? ""),
  });
  const uniqueDiagnostics = deduplicateContentBlockDiagnostics(diagnostics);
  const sourceLabel = resolvedAsset
    ? formatAssetName(resolvedAsset)
    : loading
      ? "Loading content source…"
      : source?.type === "expression"
        ? "Dynamic content source"
        : source?.type === "asset"
          ? "Missing MDX Asset"
          : "No content source";

  const beginOperation = () => {
    if (disabled || loading || busyRef.current) {
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    setLocalError(undefined);
    return true;
  };

  const finishOperation = () => {
    busyRef.current = false;
    setBusy(false);
  };

  const requestSource = async (
    requestedSource: ContentBlockSource,
    confirmed?: boolean
  ) => {
    if (beginOperation() === false) {
      return;
    }
    try {
      const result = await onRequestSource({
        source: requestedSource,
        confirmed,
      });
      if (result.status === "requires-confirmation") {
        setPendingSource({
          source: requestedSource,
          diagnostics: result.diagnostics ?? [],
        });
        return;
      }
      if (result.status === "blocked" || result.status === "partial") {
        setLocalError(result.message);
        return;
      }
      setPendingSource(undefined);
    } catch (error) {
      setLocalError(getErrorMessage(error, "Unable to change source"));
    } finally {
      finishOperation();
    }
  };

  return (
    <fieldset disabled={isDisabled} style={{ display: "contents" }}>
      <Grid gap="2">
        <BindableExpressionControl
          {...binding}
          value={resolvedAsset?.id}
          validate={(value) =>
            typeof value === "string" && value !== ""
              ? undefined
              : "Content source must resolve to an Asset ID"
          }
          onChangeValue={(value) => {
            if (typeof value === "string" && value !== "") {
              void requestSource({ type: "asset", assetId: value });
            }
          }}
          onChangeExpression={(value) => {
            void requestSource({ type: "expression", value });
          }}
          onRemove={(value) => {
            if (typeof value === "string" && value !== "") {
              void requestSource({ type: "asset", assetId: value });
            }
          }}
          renderControl={() =>
            connected ? (
              <Grid columns={2} gap="2" aria-label="Content source actions">
                <SelectAsset
                  assetId={resolvedAsset?.id}
                  title="Switch MDX file"
                  accept=".mdx"
                  disabled={isDisabled}
                  triggerLabel={sourceLabel}
                  onChange={(assetId) =>
                    void requestSource({ type: "asset", assetId })
                  }
                />
                <Button
                  color="neutral"
                  disabled={isDisabled || resolvedAsset === undefined}
                  css={{ width: "100%" }}
                  onClick={() => {
                    if (resolvedAsset !== undefined) {
                      onOpen(resolvedAsset.id);
                    }
                  }}
                >
                  Open
                </Button>
              </Grid>
            ) : (
              <SelectAsset
                title="Choose MDX file"
                accept=".mdx"
                disabled={isDisabled}
                triggerLabel="Connect .mdx file"
                onChange={(assetId) =>
                  void requestSource({ type: "asset", assetId })
                }
              />
            )
          }
        />

        {(localError ?? error) !== undefined &&
          pendingSource === undefined &&
          disconnecting === false && (
            <Text role="alert" color="destructive" variant="tiny">
              {localError ?? error}
            </Text>
          )}

        {(persistenceStatus === "pending" ||
          persistenceStatus === "saving") && (
          <Text role="status" variant="tiny">
            Saving content source…
          </Text>
        )}

        {persistenceStatus === "failed" && (
          <Flex gap="2" align="center" wrap="wrap">
            <Text role="alert" color="destructive" variant="tiny">
              {persistenceError ?? "Unable to save content source."}
            </Text>
            {onRetry !== undefined && (
              <Button
                color="ghost"
                disabled={isDisabled}
                onClick={() => {
                  if (beginOperation() === false) {
                    return;
                  }
                  void onRetry()
                    .catch((error) =>
                      setLocalError(
                        getErrorMessage(error, "Unable to retry save")
                      )
                    )
                    .finally(finishOperation);
                }}
              >
                Retry
              </Button>
            )}
          </Flex>
        )}

        {busy && (
          <Text role="status" variant="tiny">
            Updating content source…
          </Text>
        )}

        {uniqueDiagnostics.length > 0 && (
          <Grid as="ul" gap="2" aria-label="MDX diagnostics">
            {uniqueDiagnostics.map((diagnostic) => (
              <Flex
                as="li"
                key={JSON.stringify(diagnostic)}
                direction="column"
                gap="1"
              >
                <Text
                  color={
                    diagnostic.severity === "error" ? "destructive" : "subtle"
                  }
                  variant="tiny"
                >
                  {diagnostic.contentRef ?? resolvedAsset?.name ?? "MDX file"}
                  {": "}
                  {formatContentBlockDiagnostic(diagnostic)}
                </Text>
                <Text color="subtle" variant="tiny">
                  Render scope: {diagnostic.renderScope ?? "current block"}
                </Text>
                {revision !== undefined && (
                  <Text color="subtle" variant="tiny">
                    Revision: {revision}
                  </Text>
                )}
                {resolvedAsset !== undefined && (
                  <Button
                    color="ghost"
                    disabled={isDisabled}
                    onClick={() => onOpen(resolvedAsset.id)}
                  >
                    Open file to repair
                  </Button>
                )}
              </Flex>
            ))}
          </Grid>
        )}

        {pendingSource !== undefined && (
          <ConnectSourceDialog
            disabled={isDisabled}
            error={localError ?? error}
            diagnostics={pendingSource.diagnostics}
            onClose={() => setPendingSource(undefined)}
            onConfirm={() => void requestSource(pendingSource.source, true)}
          />
        )}

        {disconnecting && (
          <DisconnectDialog
            disabled={isDisabled}
            error={localError ?? error}
            repeatedRenderScope={repeatedRenderScope}
            onClose={() => onDisconnectingChange(false)}
            onConfirm={() => {
              if (beginOperation() === false) {
                return;
              }
              void onDisconnect()
                .then((result) => {
                  if (
                    result.status === "blocked" ||
                    result.status === "partial"
                  ) {
                    setLocalError(result.message);
                    return;
                  }
                  if (result.status === "applied") {
                    onDisconnectingChange(false);
                  }
                })
                .catch((error) =>
                  setLocalError(
                    getErrorMessage(error, "Unable to disconnect source")
                  )
                )
                .finally(finishOperation);
            }}
          />
        )}
      </Grid>
    </fieldset>
  );
};
