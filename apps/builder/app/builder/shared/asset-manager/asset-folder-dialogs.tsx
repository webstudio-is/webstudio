import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogTitleActions,
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
import { AssetFolderSelector } from "./asset-folder-selector";
import {
  AssetManagerItemActionsDropdown,
  type AssetManagerItemActions,
} from "./asset-manager-item-menu";
import {
  createAssetFolder,
  deleteAssetFolder,
  saveAssetFolder,
} from "./asset-folder-actions";

type AssetFolderFormValues = {
  name: string;
  parentId: string | undefined;
};

const runAndClose = (
  action: () => unknown,
  onOpenChange: (open: boolean) => void
) => {
  if (action() !== undefined) {
    onOpenChange(false);
  }
};

const AssetFolderForm = ({
  id,
  open,
  initialName,
  initialParentId,
  excludedFolderId,
  submitLabel,
  secondaryAction,
  onSubmit,
}: {
  id: string;
  open: boolean;
  initialName: string;
  initialParentId: string | undefined;
  excludedFolderId?: string;
  submitLabel: string;
  secondaryAction?: ReactNode;
  onSubmit: (values: AssetFolderFormValues) => void;
}) => {
  const folders = useStore($assetFolders);
  const hierarchy = useMemo(
    () => createAssetFolderHierarchy(folders),
    [folders]
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
      excludeIds:
        excludedFolderId === undefined
          ? undefined
          : new Set([excludedFolderId]),
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
          autoFocus
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
        excludedFolderId={excludedFolderId}
        rootLabel="Parent folder"
      />
      <Flex justify="end" gap={2}>
        {secondaryAction}
        <Button disabled={canSubmit === false} onClick={submit}>
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
    runAndClose(() => createAssetFolder(values), onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent minWidth={360}>
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
  actions,
}: {
  folder: AssetFolder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDeleteConfirmation?: boolean;
  actions?: AssetManagerItemActions;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  useLayoutEffect(() => {
    if (open) {
      setConfirmDelete(initialDeleteConfirmation);
    }
  }, [initialDeleteConfirmation, open]);

  const save = (values: AssetFolderFormValues) =>
    runAndClose(() => saveAssetFolder(folder.id, values), onOpenChange);

  const remove = () =>
    runAndClose(() => deleteAssetFolder(folder.id), onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent minWidth={360}>
        <DialogTitle
          suffix={
            confirmDelete ? undefined : (
              <DialogTitleActions>
                <AssetManagerItemActionsDropdown
                  actions={{
                    ...actions,
                    open: undefined,
                    rename: () => setConfirmDelete(false),
                    delete: () => setConfirmDelete(true),
                  }}
                />
                <DialogClose />
              </DialogTitleActions>
            )
          }
        >
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
