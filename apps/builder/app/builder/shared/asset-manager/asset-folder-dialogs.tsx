import {
  useLayoutEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxAndLabel,
  Dialog,
  DialogContent,
  DialogTitle,
  Flex,
  Grid,
  InputField,
  Label,
  SmallIconButton,
  Text,
  toast,
  theme,
} from "@webstudio-is/design-system";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  type AssetFolder,
} from "@webstudio-is/sdk";
import { CopyIcon, TrashIcon } from "@webstudio-is/icons";
import {
  collectionConfigFilename,
  createDefaultCollectionConfig,
  createDefaultCollectionTemplate,
  defaultCollectionTemplateFilename,
} from "@webstudio-is/content-engine";
import { $assetFolders, $assets, $project } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { AssetFolderSelector } from "./asset-folder-selector";
import { uploadSingleAsset } from "../assets/upload-assets";
import {
  $lastTransactionId,
  waitForTransactionComplete,
} from "~/shared/sync/project-queue";

type AssetFolderFormValues = {
  name: string;
  parentId: string | undefined;
  useAsContentCollection?: boolean;
};

const closeOnSuccess = (
  result: unknown,
  onOpenChange: (open: boolean) => void
) => {
  if (result !== undefined) {
    onOpenChange(false);
  }
};

const stopEscapePropagation = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.stopPropagation();
  }
};

export const getCollectionFolderSyncError = (result: "failure" | "timeout") =>
  result === "timeout"
    ? "Folder synchronization timed out. Retry when the connection is stable."
    : "The folder could not be synchronized. Close this dialog and reload the project before creating it again.";

export const assertCollectionSetupProject = ({
  expectedProjectId,
  currentProjectId,
}: {
  expectedProjectId: string;
  currentProjectId: string | undefined;
}) => {
  if (currentProjectId !== expectedProjectId) {
    throw new Error(
      "The project changed before collection setup finished. Return to the original project to retry."
    );
  }
};

const createAssetFolder = (values: AssetFolderFormValues) => {
  const result = executeRuntimeMutation({
    id: "assetFolders.create",
    input: { name: values.name, parentId: values.parentId },
  });
  const transactionId = $lastTransactionId.get();
  if (result === undefined || transactionId === undefined) {
    return;
  }
  return { ...result.result, transactionId };
};

const AssetFolderForm = ({
  id,
  open,
  initialName,
  initialParentId,
  excludedFolderId,
  folderId,
  autoFocusSubmit = false,
  submitLabel,
  secondaryAction,
  showCollectionOption = false,
  onSubmit,
}: {
  id: string;
  open: boolean;
  initialName: string;
  initialParentId: string | undefined;
  excludedFolderId?: string;
  folderId?: string;
  autoFocusSubmit?: boolean;
  submitLabel: string;
  secondaryAction?: ReactNode;
  showCollectionOption?: boolean;
  onSubmit: (values: AssetFolderFormValues) => void;
}) => {
  const folders = useStore($assetFolders);
  const hierarchy = useMemo(
    () => createAssetFolderHierarchy(folders),
    [folders]
  );
  const excludedFolderIds = useMemo(
    () =>
      excludedFolderId === undefined ? undefined : new Set([excludedFolderId]),
    [excludedFolderId]
  );
  const [name, setName] = useState(initialName);
  const [parentId, setParentId] = useState(initialParentId);
  const [useAsContentCollection, setUseAsContentCollection] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      setName(initialName);
      setParentId(initialParentId);
      setUseAsContentCollection(false);
    }
  }, [initialName, initialParentId, open]);

  const normalizedName = name.trim();
  const duplicate =
    hierarchy.findByName({
      name,
      parentId,
      excludeIds: excludedFolderIds,
    }) !== undefined;
  const canSubmit = normalizedName.length > 0 && duplicate === false;
  const submit = () => {
    if (canSubmit) {
      onSubmit({
        name: normalizedName,
        parentId,
        ...(showCollectionOption ? { useAsContentCollection } : {}),
      });
    }
  };

  return (
    <Grid gap={3} css={{ padding: theme.panel.padding }}>
      <Grid gap={1}>
        <Label htmlFor={id}>Name</Label>
        <InputField
          id={id}
          autoFocus={autoFocusSubmit === false}
          value={name}
          color={duplicate ? "error" : undefined}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submit();
            }
          }}
        />
        {duplicate && (
          <Text color="destructive" variant="tiny">
            A folder with this name already exists here.
          </Text>
        )}
      </Grid>
      <AssetFolderSelector
        value={parentId}
        onChange={setParentId}
        excludedFolderIds={excludedFolderIds}
        rootLabel="Parent folder"
      />
      {showCollectionOption && (
        <CheckboxAndLabel>
          <Checkbox
            id="asset-folder-content-collection"
            checked={useAsContentCollection}
            onCheckedChange={(checked) =>
              setUseAsContentCollection(checked === true)
            }
          />
          <Label htmlFor="asset-folder-content-collection">
            Use as content collection
          </Label>
        </CheckboxAndLabel>
      )}
      {folderId !== undefined && (
        <Grid gap={1}>
          <Label htmlFor={`asset-folder-id-${folderId}`}>ID</Label>
          <InputField
            id={`asset-folder-id-${folderId}`}
            readOnly
            value={folderId}
            suffix={
              <Flex justify="center" css={{ paddingInline: theme.spacing[2] }}>
                <CopyToClipboard text={folderId}>
                  <SmallIconButton
                    aria-label="Copy folder ID"
                    icon={<CopyIcon />}
                  />
                </CopyToClipboard>
              </Flex>
            }
          />
        </Grid>
      )}
      <Flex justify="end" gap={2}>
        {secondaryAction}
        <Button
          color="primary"
          autoFocus={autoFocusSubmit}
          disabled={canSubmit === false}
          onClick={submit}
        >
          {submitLabel}
        </Button>
      </Flex>
    </Grid>
  );
};

export const CreateAssetFolderDialog = ({
  open,
  onOpenChange,
  currentFolderId,
  canCreateContentCollection = true,
  createFolder = createAssetFolder,
  waitForFolderSync = waitForTransactionComplete,
  uploadAsset = uploadSingleAsset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolderId: string | undefined;
  canCreateContentCollection?: boolean;
  createFolder?: (
    values: AssetFolderFormValues
  ) => { folderId: string; transactionId: string } | undefined;
  waitForFolderSync?: (
    transactionId: string
  ) => Promise<"success" | "failure" | "timeout">;
  uploadAsset?: typeof uploadSingleAsset;
}) => {
  const [pendingCollection, setPendingCollection] = useState<{
    folderId: string;
    projectId: string;
    folderSynced: boolean;
    transactionId: string;
  }>();
  const [initializing, setInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string>();
  const [folderSyncFailed, setFolderSyncFailed] = useState(false);

  const initializeCollection = async ({
    folderId,
    projectId,
  }: {
    folderId: string;
    projectId: string;
  }) => {
    assertCollectionSetupProject({
      expectedProjectId: projectId,
      currentProjectId: $project.get()?.id,
    });
    const folderAssets = Array.from($assets.get().values()).filter(
      (asset) => asset.folderId === folderId
    );
    const templateExists = folderAssets.some(
      (asset) => formatAssetName(asset) === defaultCollectionTemplateFilename
    );
    if (templateExists === false) {
      const template = await uploadAsset(
        "file",
        new File(
          [createDefaultCollectionTemplate()],
          defaultCollectionTemplateFilename,
          { type: "text/mdx" }
        ),
        { folderId, deduplicate: true }
      );
      if (template === undefined) {
        throw new Error("The collection template could not be created.");
      }
    }
    assertCollectionSetupProject({
      expectedProjectId: projectId,
      currentProjectId: $project.get()?.id,
    });
    const configExists = Array.from($assets.get().values()).some(
      (asset) =>
        asset.folderId === folderId &&
        formatAssetName(asset) === collectionConfigFilename
    );
    if (configExists === false) {
      const config = await uploadAsset(
        "file",
        new File([createDefaultCollectionConfig()], collectionConfigFilename, {
          type: "application/json",
        }),
        { folderId, deduplicate: true }
      );
      if (config === undefined) {
        throw new Error("The collection configuration could not be created.");
      }
    }
    assertCollectionSetupProject({
      expectedProjectId: projectId,
      currentProjectId: $project.get()?.id,
    });
  };

  const finishCollectionSetup = (pending: {
    folderId: string;
    projectId: string;
    folderSynced: boolean;
    transactionId: string;
  }) => {
    setInitializing(true);
    setInitializationError(undefined);
    void (async () => {
      let nextPending = pending;
      if (nextPending.folderSynced === false) {
        const completion = await waitForFolderSync(nextPending.transactionId);
        if (completion !== "success") {
          if (completion === "failure") {
            setFolderSyncFailed(true);
          }
          throw new Error(getCollectionFolderSyncError(completion));
        }
        setFolderSyncFailed(false);
        nextPending = { ...nextPending, folderSynced: true };
        setPendingCollection(nextPending);
      }
      await initializeCollection(nextPending);
    })()
      .then(() => {
        setPendingCollection(undefined);
        toast.success("Collection folder created.");
        onOpenChange(false);
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "The collection could not be created.";
        setInitializationError(message);
        toast.error(message);
      })
      .finally(() => setInitializing(false));
  };

  const create = (values: AssetFolderFormValues) => {
    const projectId = $project.get()?.id;
    if (projectId === undefined) {
      toast.error("Project not found");
      return;
    }
    const result = createFolder(values);
    if (result === undefined) {
      return;
    }
    if (values.useAsContentCollection !== true) {
      onOpenChange(false);
      return;
    }
    const pending = {
      folderId: result.folderId,
      projectId,
      folderSynced: false,
      transactionId: result.transactionId,
    };
    setPendingCollection(pending);
    setFolderSyncFailed(false);
    finishCollectionSetup(pending);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (initializing === false) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent
        css={{ width: "min(420px, calc(100vw - 32px))" }}
        aria-describedby={undefined}
        onKeyDown={stopEscapePropagation}
      >
        <DialogTitle>
          {pendingCollection === undefined
            ? "New folder"
            : "Finish collection setup"}
        </DialogTitle>
        {pendingCollection === undefined ? (
          <AssetFolderForm
            id="asset-folder-name"
            open={open}
            initialName=""
            initialParentId={currentFolderId}
            submitLabel="Create folder"
            showCollectionOption={canCreateContentCollection}
            onSubmit={create}
          />
        ) : (
          <Grid gap={3} css={{ padding: theme.panel.padding }}>
            <Text>
              {initializing
                ? "Creating the collection template and configuration…"
                : "The folder was created, but its collection files are incomplete."}
            </Text>
            {initializationError !== undefined && (
              <Text role="alert" color="destructive" variant="tiny">
                {initializationError}
              </Text>
            )}
            <Flex justify="end" gap={2} wrap="wrap">
              {initializing === false && (
                <Button
                  onClick={() => {
                    if (folderSyncFailed) {
                      setPendingCollection(undefined);
                    }
                    onOpenChange(false);
                  }}
                >
                  {folderSyncFailed ? "Close" : "Finish later"}
                </Button>
              )}
              {folderSyncFailed === false && (
                <Button
                  color="primary"
                  disabled={initializing}
                  onClick={() => finishCollectionSetup(pendingCollection)}
                >
                  {initializing ? "Setting up…" : "Retry setup"}
                </Button>
              )}
            </Flex>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const AssetFolderSettingsDialog = ({
  folder,
  open,
  onOpenChange,
  initialDeleteConfirmation = false,
  canDelete = true,
}: {
  folder: AssetFolder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDeleteConfirmation?: boolean;
  canDelete?: boolean;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  useLayoutEffect(() => {
    if (open) {
      setConfirmDelete(canDelete && initialDeleteConfirmation);
    }
  }, [canDelete, initialDeleteConfirmation, open]);

  const save = (values: AssetFolderFormValues) =>
    closeOnSuccess(
      executeRuntimeMutation({
        id: "assetFolders.update",
        input: {
          folderId: folder.id,
          values: {
            name: values.name,
            parentId: values.parentId ?? null,
          },
        },
      }),
      onOpenChange
    );

  const remove = () =>
    closeOnSuccess(
      executeRuntimeMutation({
        id: "assetFolders.delete",
        input: { folderId: folder.id },
      }),
      onOpenChange
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        minWidth={360}
        aria-describedby={undefined}
        onKeyDown={stopEscapePropagation}
      >
        <DialogTitle>
          {confirmDelete ? "Delete folder" : "Folder settings"}
        </DialogTitle>
        {canDelete && confirmDelete ? (
          <Box css={{ padding: theme.panel.padding }}>
            <Text>
              Delete “{folder.name}”? Everything inside this folder, including
              nested folders and assets, will be deleted.
            </Text>
            <Flex justify="end" gap={2} css={{ marginTop: theme.spacing[4] }}>
              <Button
                autoFocus
                color="destructive"
                prefix={<TrashIcon />}
                onClick={remove}
              >
                Delete folder
              </Button>
            </Flex>
          </Box>
        ) : (
          <AssetFolderForm
            id={`asset-folder-name-${folder.id}`}
            open={open}
            initialName={folder.name}
            initialParentId={folder.parentId}
            excludedFolderId={folder.id}
            folderId={folder.id}
            autoFocusSubmit
            submitLabel="Save"
            onSubmit={save}
            secondaryAction={
              canDelete ? (
                <Button
                  color="destructive"
                  prefix={<TrashIcon />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              ) : undefined
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export const MoveAssetManagerItemsDialog = ({
  initialFolderId,
  excludedFolderIds,
  canMove,
  onMove,
  onClose,
}: {
  initialFolderId: string | undefined;
  excludedFolderIds?: ReadonlySet<string>;
  canMove: (folderId: string | undefined) => boolean;
  onMove: (folderId: string | undefined) => void;
  onClose: () => void;
}) => {
  const [folderId, setFolderId] = useState(initialFolderId);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open === false) {
          onClose();
        }
      }}
    >
      <DialogContent
        minWidth={360}
        aria-describedby={undefined}
        onKeyDown={stopEscapePropagation}
      >
        <DialogTitle>Move items</DialogTitle>
        <Grid gap={3} css={{ padding: theme.panel.padding }}>
          <AssetFolderSelector
            value={folderId}
            onChange={setFolderId}
            excludedFolderIds={excludedFolderIds}
            rootLabel="Folder"
          />
          <Flex justify="end">
            <Button
              color="primary"
              autoFocus
              disabled={canMove(folderId) === false}
              onClick={() => {
                onMove(folderId);
                onClose();
              }}
            >
              Move
            </Button>
          </Flex>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};
