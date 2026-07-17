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
  Dialog,
  DialogContent,
  DialogTitle,
  Flex,
  Grid,
  InputField,
  Label,
  Text,
  theme,
} from "@webstudio-is/design-system";
import {
  createAssetFolderHierarchy,
  type AssetFolder,
} from "@webstudio-is/sdk";
import { TrashIcon } from "@webstudio-is/icons";
import { $assetFolders } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { AssetFolderSelector } from "./asset-folder-selector";

type AssetFolderFormValues = {
  name: string;
  parentId: string | undefined;
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

const AssetFolderForm = ({
  id,
  open,
  initialName,
  initialParentId,
  excludedFolderId,
  autoFocusSubmit = false,
  submitLabel,
  secondaryAction,
  onSubmit,
}: {
  id: string;
  open: boolean;
  initialName: string;
  initialParentId: string | undefined;
  excludedFolderId?: string;
  autoFocusSubmit?: boolean;
  submitLabel: string;
  secondaryAction?: ReactNode;
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

  useLayoutEffect(() => {
    if (open) {
      setName(initialName);
      setParentId(initialParentId);
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
      onSubmit({ name: normalizedName, parentId });
    }
  };

  return (
    <Grid gap={3} css={{ padding: theme.panel.padding }}>
      <Grid gap={1}>
        <Label htmlFor={id}>Folder</Label>
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
      <Flex justify="end" gap={2}>
        {secondaryAction}
        <Button
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolderId: string | undefined;
}) => {
  const create = (values: AssetFolderFormValues) =>
    closeOnSuccess(
      executeRuntimeMutation({
        id: "assetFolders.create",
        input: values,
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
        <DialogTitle>New folder</DialogTitle>
        <AssetFolderForm
          id="asset-folder-name"
          open={open}
          initialName=""
          initialParentId={currentFolderId}
          submitLabel="Create folder"
          onSubmit={create}
        />
      </DialogContent>
    </Dialog>
  );
};

export const AssetFolderSettingsDialog = ({
  folder,
  open,
  onOpenChange,
  initialDeleteConfirmation = false,
}: {
  folder: AssetFolder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDeleteConfirmation?: boolean;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  useLayoutEffect(() => {
    if (open) {
      setConfirmDelete(initialDeleteConfirmation);
    }
  }, [initialDeleteConfirmation, open]);

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
        {confirmDelete ? (
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
            autoFocusSubmit
            submitLabel="Save"
            onSubmit={save}
            secondaryAction={
              <Button
                color="destructive"
                prefix={<TrashIcon />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
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
