import {
  useLayoutEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import {
  PanelContent,
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
  createId,
  createAssetFolderHierarchy,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
import { CopyIcon, TrashIcon } from "@webstudio-is/icons";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import { $assetFolders, $assets, $project } from "~/shared/sync/data-stores";
import {
  executeRuntimeMutation,
  getWebstudioData,
} from "~/shared/instance-utils/data";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { AssetFolderSelector } from "./asset-folder-selector";
import { fetch } from "~/shared/fetch.client";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";

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
  if (result === undefined) {
    return;
  }
  return result.result;
};

export const createContentCollectionFolder = async ({
  id,
  name,
  parentId,
  projectId,
  request = fetch,
}: {
  id: string;
  name: string;
  parentId: string | undefined;
  projectId: string;
  request?: typeof fetch;
}) => {
  const response = await request(
    `/rest/assets/collection-folders?projectId=${encodeURIComponent(projectId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, parentId }),
    }
  );
  const payload = (await response.json()) as
    | { folder: AssetFolder; assets: Asset[] }
    | { errors?: string };
  if (response.ok === false || "folder" in payload === false) {
    throw new Error(
      "errors" in payload && typeof payload.errors === "string"
        ? payload.errors
        : "The collection could not be created."
    );
  }
  assertCollectionSetupProject({
    expectedProjectId: projectId,
    currentProjectId: $project.get()?.id,
  });
  const changes: BuilderPatchChange[] = [];
  if ($assetFolders.get().has(payload.folder.id) === false) {
    changes.push({
      namespace: "assetFolders",
      patches: [
        { op: "add", path: [payload.folder.id], value: payload.folder },
      ],
    });
  }
  const newAssets = payload.assets.filter(
    (asset) => $assets.get().has(asset.id) === false
  );
  if (newAssets.length > 0) {
    changes.push({
      namespace: "assets",
      patches: newAssets.map((asset) => ({
        op: "add",
        path: [asset.id],
        value: asset,
      })),
    });
  }
  if (changes.length === 0) {
    invalidateAssets();
  } else {
    createTransactionFromBuilderPatchPayload({
      data: getWebstudioData(),
      payload: changes,
    });
    onNextTransactionComplete(invalidateAssets);
  }
  return payload.folder;
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
    <PanelContent as={Grid} gap={3}>
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
    </PanelContent>
  );
};

export const CreateAssetFolderDialog = ({
  open,
  onOpenChange,
  onConfigureCollection,
  currentFolderId,
  canCreateContentCollection = true,
  createFolder = createAssetFolder,
  createCollection = createContentCollectionFolder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigureCollection?: (folderId: string) => void;
  currentFolderId: string | undefined;
  canCreateContentCollection?: boolean;
  createFolder?: (
    values: AssetFolderFormValues
  ) => { folderId: string } | undefined;
  createCollection?: typeof createContentCollectionFolder;
}) => {
  const [pendingCollection, setPendingCollection] = useState<{
    folderId: string;
    projectId: string;
    name: string;
    parentId: string | undefined;
  }>();
  const [initializing, setInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string>();
  const [createdCollectionFolderId, setCreatedCollectionFolderId] =
    useState<string>();

  const finishCollectionSetup = (pending: {
    folderId: string;
    projectId: string;
    name: string;
    parentId: string | undefined;
  }) => {
    setInitializing(true);
    setInitializationError(undefined);
    void (async () => {
      await createCollection({
        id: pending.folderId,
        name: pending.name,
        parentId: pending.parentId,
        projectId: pending.projectId,
      });
    })()
      .then(() => {
        setPendingCollection(undefined);
        setCreatedCollectionFolderId(pending.folderId);
        toast.success("Collection folder created.");
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
    if (values.useAsContentCollection !== true) {
      const result = createFolder(values);
      if (result === undefined) {
        return;
      }
      onOpenChange(false);
      return;
    }
    const pending = {
      folderId: createId(),
      projectId,
      name: values.name,
      parentId: values.parentId,
    };
    setPendingCollection(pending);
    finishCollectionSetup(pending);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (initializing === false) {
          if (nextOpen === false) {
            setCreatedCollectionFolderId(undefined);
          }
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
          {createdCollectionFolderId !== undefined
            ? "Collection created"
            : pendingCollection === undefined
              ? "New folder"
              : "Finish collection setup"}
        </DialogTitle>
        {createdCollectionFolderId !== undefined ? (
          <PanelContent as={Grid} gap={3}>
            <Text>
              The collection files are ready. You can configure its fields and
              entry rules now.
            </Text>
            <Flex justify="end" gap={2}>
              <Button
                autoFocus={onConfigureCollection === undefined}
                onClick={() => {
                  setCreatedCollectionFolderId(undefined);
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
              {onConfigureCollection !== undefined && (
                <Button
                  autoFocus
                  color="primary"
                  onClick={() => {
                    setCreatedCollectionFolderId(undefined);
                    onOpenChange(false);
                    onConfigureCollection(createdCollectionFolderId);
                  }}
                >
                  Configure collection
                </Button>
              )}
            </Flex>
          </PanelContent>
        ) : pendingCollection === undefined ? (
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
          <PanelContent as={Grid} gap={3}>
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
                    onOpenChange(false);
                  }}
                >
                  Finish later
                </Button>
              )}
              <Button
                color="primary"
                disabled={initializing}
                onClick={() => finishCollectionSetup(pendingCollection)}
              >
                {initializing ? "Setting up…" : "Retry setup"}
              </Button>
            </Flex>
          </PanelContent>
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
          <PanelContent as={Box}>
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
          </PanelContent>
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
        <PanelContent as={Grid} gap={3}>
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
        </PanelContent>
      </DialogContent>
    </Dialog>
  );
};
