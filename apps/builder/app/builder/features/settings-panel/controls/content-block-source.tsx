import { useRef, useState } from "react";
import {
  Button,
  Box,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Flex,
  Grid,
  Text,
  Tooltip,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { AlertIcon } from "@webstudio-is/icons";
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

/**
 * Presentation and interaction boundary for Content Block source lifecycle.
 * The caller owns loading, exact-Asset authorization, lifecycle preparation,
 * and persistence. This component never updates the src prop directly.
 */
export const ContentBlockSourceControl = ({
  source,
  resolvedAsset,
  readOnly = false,
  disabled = false,
  loading = false,
  error,
  diagnostics = [],
  persistenceStatus,
  persistenceError,
  onRetry,
  onRequestSource,
  onOpen,
}: {
  source?: ContentBlockSource;
  resolvedAsset?: Asset;
  readOnly?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  diagnostics?: readonly ContentBlockDiagnostic[];
  persistenceStatus?: "saved" | "pending" | "saving" | "failed" | "conflicting";
  persistenceError?: string;
  onRetry?: () => Promise<void>;
  onRequestSource: (input: {
    source: ContentBlockSource;
    confirmed?: boolean;
  }) => Promise<ContentBlockSourceActionResult>;
  onOpen: (assetId: string) => void;
}) => {
  const [pendingSource, setPendingSource] = useState<PendingSource>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [localError, setLocalError] = useState<string>();
  const isDisabled = disabled || loading || busy;
  const isSourceMutationDisabled = readOnly || isDisabled;
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
    if (readOnly || beginOperation() === false) {
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
          showBinding={readOnly === false}
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
                <Flex align="center" gap="1">
                  <Box css={{ flex: 1, minWidth: 0 }}>
                    <SelectAsset
                      assetId={resolvedAsset?.id}
                      title="Switch MDX file"
                      accept=".mdx"
                      disabled={isSourceMutationDisabled}
                      triggerLabel={sourceLabel}
                      onChange={(assetId) =>
                        void requestSource({ type: "asset", assetId })
                      }
                    />
                  </Box>
                  {uniqueDiagnostics.length > 0 && (
                    <Tooltip
                      content={
                        <Grid gap="1">
                          <Text>
                            {formatContentBlockDiagnostic(uniqueDiagnostics[0])}
                          </Text>
                          {uniqueDiagnostics.length > 1 && (
                            <Text>
                              {uniqueDiagnostics.length - 1} more diagnostic
                              {uniqueDiagnostics.length === 2 ? "" : "s"}
                            </Text>
                          )}
                        </Grid>
                      }
                    >
                      <Flex
                        as="span"
                        align="center"
                        role="img"
                        tabIndex={0}
                        aria-label={`MDX source warning: ${formatContentBlockDiagnostic(uniqueDiagnostics[0])}${uniqueDiagnostics.length > 1 ? ` ${uniqueDiagnostics.length - 1} more diagnostic${uniqueDiagnostics.length === 2 ? "" : "s"}.` : ""}`}
                        css={{
                          color: rawTheme.colors.backgroundAlertMain,
                          flexShrink: 0,
                        }}
                      >
                        <AlertIcon size={14} />
                      </Flex>
                    </Tooltip>
                  )}
                </Flex>
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
            ) : readOnly ? null : (
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

        {(localError ?? error) !== undefined && pendingSource === undefined && (
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

        {pendingSource !== undefined && (
          <ConnectSourceDialog
            disabled={isSourceMutationDisabled}
            error={localError ?? error}
            diagnostics={pendingSource.diagnostics}
            onClose={() => setPendingSource(undefined)}
            onConfirm={() => void requestSource(pendingSource.source, true)}
          />
        )}
      </Grid>
    </fieldset>
  );
};
