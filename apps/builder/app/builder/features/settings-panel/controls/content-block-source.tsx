import { useId, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Flex,
  FloatingPanel,
  Grid,
  Label,
  Text,
  TextArea,
  theme,
} from "@webstudio-is/design-system";
import type { MarkdownToMdxConversionPreview } from "@webstudio-is/content-engine/mdx-conversion";
import type { ContentBlockSourceAuthority } from "@webstudio-is/project-build/runtime";
import {
  formatAssetName,
  type Asset,
  type ContentBlockDiagnostic,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { AssetManager } from "~/builder/shared/asset-manager";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { CreateTextFileDialog } from "~/builder/features/text-file-editor/create-text-file-dialog";
import { useBindableControl } from "./use-bindable-control";
import {
  deduplicateContentBlockDiagnostics,
  formatContentBlockDiagnostic,
} from "~/shared/content-block-content";

export type ContentBlockSourceMutationResult =
  | Readonly<{ status: "applied" }>
  | Readonly<{ status: "partial"; message: string }>
  | Readonly<{ status: "blocked"; message: string }>;

export type ContentBlockSourceActionResult =
  | ContentBlockSourceMutationResult
  | Readonly<{ status: "requires-authority" }>;

type PendingSource = Readonly<{
  source: ContentBlockSource;
  action: "connect" | "switch";
}>;

type PendingConversion = Readonly<{
  assetId: string;
  preview: MarkdownToMdxConversionPreview;
}>;

const SourceAuthorityDialog = ({
  pending,
  disabled,
  error,
  onClose,
  onSelect,
}: {
  pending: PendingSource;
  disabled: boolean;
  error?: string;
  onClose: () => void;
  onSelect: (authority: ContentBlockSourceAuthority) => void;
}) => (
  <Dialog open onOpenChange={(open) => open === false && onClose()}>
    <DialogContent>
      <DialogTitle>
        {pending.action === "connect"
          ? "Connect content source"
          : "Switch content source"}
      </DialogTitle>
      <Grid gap="3" css={{ padding: theme.panel.padding }}>
        <DialogDescription>
          Both the Content Block and file contain content. Choose which body to
          keep. File frontmatter is always preserved.
        </DialogDescription>
        {error !== undefined && (
          <Text role="alert" color="destructive" variant="tiny">
            {error}
          </Text>
        )}
      </Grid>
      <DialogActions>
        <Button
          autoFocus
          disabled={disabled}
          onClick={() => onSelect("use-file-content")}
        >
          Use file content
        </Button>
        <Button
          color="neutral"
          disabled={disabled}
          onClick={() => onSelect("replace-file-body-with-block-content")}
        >
          Replace file body with block content
        </Button>
        <DialogClose>
          <Button color="ghost" disabled={disabled}>
            Cancel
          </Button>
        </DialogClose>
      </DialogActions>
    </DialogContent>
  </Dialog>
);

const DisconnectDialog = ({
  disabled,
  error,
  onClose,
  onConfirm,
}: {
  disabled: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open onOpenChange={(open) => open === false && onClose()}>
    <DialogContent>
      <DialogTitle>Disconnect content source</DialogTitle>
      <Grid gap="3" css={{ padding: theme.panel.padding }}>
        <DialogDescription>
          The current file content will be copied into the Content Block. The
          file will not be changed.
        </DialogDescription>
        {error !== undefined && (
          <Text role="alert" color="destructive" variant="tiny">
            {error}
          </Text>
        )}
      </Grid>
      <DialogActions>
        <Button autoFocus disabled={disabled} onClick={onConfirm}>
          Copy file content and disconnect
        </Button>
        <DialogClose>
          <Button color="ghost" disabled={disabled}>
            Cancel
          </Button>
        </DialogClose>
      </DialogActions>
    </DialogContent>
  </Dialog>
);

const SourcePicker = ({
  title,
  accept,
  disabled,
  triggerLabel,
  onSelect,
}: {
  title: string;
  accept: string;
  disabled: boolean;
  triggerLabel: string;
  onSelect: (assetId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <FloatingPanel
      title={title}
      open={open}
      onOpenChange={setOpen}
      content={
        <AssetManager
          accept={accept}
          onChange={(assetId) => {
            setOpen(false);
            onSelect(assetId);
          }}
        />
      }
    >
      <Button color="neutral" disabled={disabled}>
        {triggerLabel}
      </Button>
    </FloatingPanel>
  );
};

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
  onRequestSource,
  onDisconnect,
  onOpen,
  onPreviewMarkdown,
  onCreateConvertedMdx,
}: {
  source?: ContentBlockSource;
  resolvedAsset?: Asset;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  diagnostics?: readonly ContentBlockDiagnostic[];
  onRequestSource: (input: {
    source: ContentBlockSource;
    authority?: ContentBlockSourceAuthority;
  }) => Promise<ContentBlockSourceActionResult>;
  onDisconnect: () => Promise<ContentBlockSourceMutationResult>;
  onOpen: (assetId: string) => void;
  onPreviewMarkdown: (
    assetId: string
  ) => Promise<MarkdownToMdxConversionPreview>;
  onCreateConvertedMdx: (
    input: PendingConversion
  ) => Promise<string | undefined>;
}) => {
  const conversionPreviewId = useId();
  const [pendingSource, setPendingSource] = useState<PendingSource>();
  const [disconnecting, setDisconnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [localError, setLocalError] = useState<string>();
  const [conversion, setConversion] = useState<PendingConversion>();
  const [creatingMdx, setCreatingMdx] = useState(false);
  const isDisabled = disabled || loading || busy;
  const connected = source !== undefined;
  const binding = useBindableControl({
    boundExpression: source?.type === "expression" ? source.value : undefined,
    fallbackExpression: JSON.stringify(resolvedAsset?.id ?? ""),
  });
  const uniqueDiagnostics = deduplicateContentBlockDiagnostics(diagnostics);

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
    authority?: ContentBlockSourceAuthority
  ) => {
    if (beginOperation() === false) {
      return;
    }
    try {
      const result = await onRequestSource({
        source: requestedSource,
        authority,
      });
      if (result.status === "requires-authority") {
        setPendingSource({
          source: requestedSource,
          action: connected ? "switch" : "connect",
        });
        return;
      }
      if (result.status === "blocked" || result.status === "partial") {
        setLocalError(result.message);
        return;
      }
      setPendingSource(undefined);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Unable to change source"
      );
    } finally {
      finishOperation();
    }
  };

  return (
    <fieldset disabled={isDisabled} style={{ display: "contents" }}>
      <Text as="legend" variant="labels">
        Content source
      </Text>
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
          renderControl={() => (
            <Flex gap="2" align="center" wrap="wrap">
              <Text>
                {resolvedAsset
                  ? formatAssetName(resolvedAsset)
                  : loading
                    ? "Loading content source…"
                    : source?.type === "expression"
                      ? "Dynamic content source"
                      : source?.type === "asset"
                        ? "Missing MDX Asset"
                        : "No content source"}
              </Text>
              {resolvedAsset !== undefined && (
                <Button
                  color="ghost"
                  disabled={isDisabled}
                  onClick={() => onOpen(resolvedAsset.id)}
                >
                  Open
                </Button>
              )}
            </Flex>
          )}
        />

        <Flex gap="2" wrap="wrap">
          <SourcePicker
            title={connected ? "Switch MDX file" : "Choose MDX file"}
            accept=".mdx"
            disabled={isDisabled}
            triggerLabel={connected ? "Replace or switch" : "Choose file"}
            onSelect={(assetId) =>
              void requestSource({ type: "asset", assetId })
            }
          />
          <Button
            color="neutral"
            disabled={isDisabled}
            onClick={() => setCreatingMdx(true)}
          >
            Create MDX file
          </Button>
          <SourcePicker
            title="Convert Markdown file"
            accept=".md"
            disabled={isDisabled}
            triggerLabel="Convert Markdown"
            onSelect={(assetId) => {
              if (beginOperation() === false) {
                return;
              }
              void onPreviewMarkdown(assetId)
                .then((preview) => setConversion({ assetId, preview }))
                .catch((error) =>
                  setLocalError(
                    error instanceof Error
                      ? error.message
                      : "Unable to preview conversion"
                  )
                )
                .finally(finishOperation);
            }}
          />
          {connected && (
            <Button
              color="ghost"
              disabled={isDisabled}
              onClick={() => setDisconnecting(true)}
            >
              Disconnect
            </Button>
          )}
        </Flex>

        {(localError ?? error) !== undefined &&
          pendingSource === undefined &&
          disconnecting === false &&
          conversion === undefined && (
            <Text role="alert" color="destructive" variant="tiny">
              {localError ?? error}
            </Text>
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
          <SourceAuthorityDialog
            pending={pendingSource}
            disabled={isDisabled}
            error={localError ?? error}
            onClose={() => setPendingSource(undefined)}
            onSelect={(authority) =>
              void requestSource(pendingSource.source, authority)
            }
          />
        )}

        {disconnecting && (
          <DisconnectDialog
            disabled={isDisabled}
            error={localError ?? error}
            onClose={() => setDisconnecting(false)}
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
                    setDisconnecting(false);
                  }
                })
                .catch((error) =>
                  setLocalError(
                    error instanceof Error
                      ? error.message
                      : "Unable to disconnect source"
                  )
                )
                .finally(finishOperation);
            }}
          />
        )}

        {conversion !== undefined && (
          <Dialog
            open
            onOpenChange={(open) => open === false && setConversion(undefined)}
          >
            <DialogContent>
              <DialogTitle>Convert Markdown to MDX</DialogTitle>
              <Grid gap="3" css={{ padding: theme.panel.padding }}>
                <DialogDescription>
                  {conversion.preview.omissions.length === 0
                    ? "All content can be converted. The original Markdown file will not be changed."
                    : `${conversion.preview.omissions.length} unsupported ${
                        conversion.preview.omissions.length === 1
                          ? "part"
                          : "parts"
                      } will be skipped. The original Markdown file will not be changed.`}
                </DialogDescription>
                {conversion.preview.omissions.length > 0 && (
                  <ul>
                    {conversion.preview.omissions
                      .slice(0, 10)
                      .map((omission) => (
                        <li
                          key={`${omission.nodeType}:${omission.sourceRange.start.line}:${omission.sourceRange.start.column}`}
                        >
                          <Text variant="tiny">
                            {omission.nodeType}: {omission.reason}
                          </Text>
                        </li>
                      ))}
                    {conversion.preview.omissions.length > 10 && (
                      <li>
                        <Text variant="tiny">
                          {conversion.preview.omissions.length - 10} more
                          skipped parts
                        </Text>
                      </li>
                    )}
                  </ul>
                )}
                <Grid gap="1">
                  <Label htmlFor={conversionPreviewId}>Converted MDX</Label>
                  <TextArea
                    id={conversionPreviewId}
                    readOnly
                    rows={10}
                    value={conversion.preview.source}
                  />
                </Grid>
                {(localError ?? error) !== undefined && (
                  <Text role="alert" color="destructive" variant="tiny">
                    {localError ?? error}
                  </Text>
                )}
              </Grid>
              <DialogActions>
                <Button
                  autoFocus
                  disabled={isDisabled}
                  onClick={() => {
                    if (beginOperation() === false) {
                      return;
                    }
                    void onCreateConvertedMdx(conversion)
                      .then(async (assetId) => {
                        if (assetId !== undefined) {
                          setConversion(undefined);
                          finishOperation();
                          await requestSource({ type: "asset", assetId });
                        }
                      })
                      .catch((error) =>
                        setLocalError(
                          error instanceof Error
                            ? error.message
                            : "Unable to create converted MDX file"
                        )
                      )
                      .finally(finishOperation);
                  }}
                >
                  Create MDX file
                </Button>
                <DialogClose>
                  <Button color="ghost" disabled={isDisabled}>
                    Cancel
                  </Button>
                </DialogClose>
              </DialogActions>
            </DialogContent>
          </Dialog>
        )}
        <CreateTextFileDialog
          open={creatingMdx}
          defaultName="untitled.mdx"
          allowedExtensions={["mdx"]}
          title="New MDX file"
          disabled={isDisabled}
          onOpenChange={setCreatingMdx}
          onCreated={(assetId) =>
            void requestSource({ type: "asset", assetId })
          }
        />
      </Grid>
    </fieldset>
  );
};
