import { useLayoutEffect, useState, type KeyboardEvent } from "react";
import isValidFilename from "valid-filename";
import {
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
  formatAssetName,
  getFileExtension,
  getMimeTypeByExtension,
  isTextFileAsset,
  type Asset,
} from "@webstudio-is/sdk";
import { $assets } from "~/shared/sync/data-stores";
import { uploadSingleAsset } from "~/builder/shared/assets/upload-assets";

export const getTextFileNameError = ({
  name,
  assets,
}: {
  name: string;
  assets: Iterable<Asset>;
}) => {
  if (isValidFilename(name) === false) {
    return "Enter a valid file name.";
  }
  if (
    isTextFileAsset({ format: getFileExtension(name)?.toLowerCase() ?? "" }) ===
    false
  ) {
    return "Use a supported editable text extension.";
  }
  for (const asset of assets) {
    if (formatAssetName(asset) === name) {
      return "A file with this name already exists.";
    }
  }
};

const createTextFile = async ({
  name,
  folderId,
}: {
  name: string;
  folderId?: string;
}): Promise<Asset | undefined> => {
  const format = getFileExtension(name)?.toLowerCase() ?? "";
  if (isTextFileAsset({ format }) === false) {
    return;
  }
  const file = new File([""], name, {
    type: getMimeTypeByExtension(format),
  });
  return uploadSingleAsset("file", file, { folderId });
};

const stopEscapePropagation = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.stopPropagation();
  }
};

export const CreateTextFileDialog = ({
  open,
  folderId,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  folderId?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (assetId: string) => void;
}) => {
  const [name, setName] = useState("untitled.md");
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      setName("untitled.md");
      setError(undefined);
      setCreating(false);
    }
  }, [open]);

  const normalizedName = name.trim();
  const submit = async () => {
    if (creating) {
      return;
    }
    const validationError = getTextFileNameError({
      name: normalizedName,
      assets: $assets.get().values(),
    });
    setError(validationError);
    if (validationError !== undefined) {
      return;
    }
    setCreating(true);
    try {
      const asset = await createTextFile({ name: normalizedName, folderId });
      if (asset === undefined) {
        setError("The file could not be created.");
        return;
      }
      onOpenChange(false);
      onCreated(asset.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The file could not be created."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        minWidth={360}
        aria-describedby={undefined}
        onKeyDown={stopEscapePropagation}
      >
        <DialogTitle>New text file</DialogTitle>
        <Grid gap={3} css={{ padding: theme.panel.padding }}>
          <Grid gap={1}>
            <Label htmlFor="asset-text-file-name">File name</Label>
            <InputField
              id="asset-text-file-name"
              autoFocus
              disabled={creating}
              value={name}
              color={error === undefined ? undefined : "error"}
              onChange={(event) => {
                setName(event.target.value);
                setError(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void submit();
                }
              }}
            />
            {error !== undefined && (
              <Text color="destructive" variant="tiny">
                {error}
              </Text>
            )}
          </Grid>
          <Flex justify="end">
            <Button disabled={creating} onClick={() => void submit()}>
              {creating ? "Creating…" : "Create file"}
            </Button>
          </Flex>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};
