import { useLayoutEffect, useState, type ReactNode } from "react";
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
import { findAssetFolderByName, type AssetFolder } from "@webstudio-is/sdk";
import { TrashIcon } from "@webstudio-is/icons";
import { $assetFolders } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { AssetFolderSelector } from "./asset-folder-selector";

const isDuplicateName = ({
  name,
  parentId,
  ignoredId,
  folders,
}: {
  name: string;
  parentId: string | undefined;
  ignoredId?: string;
  folders: ReturnType<typeof $assetFolders.get>;
}) =>
  findAssetFolderByName(folders, {
    name,
    parentId,
    excludeIds: ignoredId === undefined ? undefined : new Set([ignoredId]),
  }) !== undefined;

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
  onSubmit: (values: { name: string; parentId: string | undefined }) => void;
}) => {
  const folders = useStore($assetFolders);
  const [name, setName] = useState(initialName);
  const [parentId, setParentId] = useState(initialParentId);

  useLayoutEffect(() => {
    if (open) {
      setName(initialName);
      setParentId(initialParentId);
    }
  }, [initialName, initialParentId, open]);

  const normalizedName = name.trim();
  const duplicate = isDuplicateName({
    name,
    parentId,
    ignoredId: excludedFolderId,
    folders,
  });
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
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolderId: string | undefined;
  onCreated?: (folderId: string) => void;
}) => {
  const create = (values: { name: string; parentId: string | undefined }) => {
    const result = executeRuntimeMutation({
      id: "assetFolders.create",
      input: values,
    });
    const folderId = result?.result.folderId;
    if (folderId !== undefined) {
      onCreated?.(folderId);
      onOpenChange(false);
    }
  };

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
}: {
  folder: AssetFolder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  useLayoutEffect(() => {
    if (open) {
      setConfirmDelete(false);
    }
  }, [open]);

  const save = (values: { name: string; parentId: string | undefined }) => {
    const result = executeRuntimeMutation({
      id: "assetFolders.update",
      input: {
        folderId: folder.id,
        values: { name: values.name, parentId: values.parentId ?? null },
      },
    });
    if (result !== undefined) {
      onOpenChange(false);
    }
  };

  const remove = () => {
    const result = executeRuntimeMutation({
      id: "assetFolders.delete",
      input: { folderId: folder.id },
    });
    if (result !== undefined) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent minWidth={360}>
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
