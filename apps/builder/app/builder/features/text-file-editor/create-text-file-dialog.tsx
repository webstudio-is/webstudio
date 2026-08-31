import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
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
  allowedExtensions,
}: {
  name: string;
  assets: Iterable<Asset>;
  allowedExtensions?: readonly string[];
}) => {
  if (isValidFilename(name) === false) {
    return "Enter a valid file name.";
  }
  const extension = getFileExtension(name)?.toLowerCase() ?? "";
  if (
    isTextFileAsset({ format: extension }) === false ||
    (allowedExtensions !== undefined &&
      allowedExtensions.some(
        (allowedExtension) => allowedExtension.toLowerCase() === extension
      ) === false)
  ) {
    return "Use a supported editable text extension.";
  }
  for (const asset of assets) {
    if (formatAssetName(asset) === name) {
      return "A file with this name already exists.";
    }
  }
};

export const createTextFileData = (name: string): File | undefined => {
  const format = getFileExtension(name)?.toLowerCase() ?? "";
  if (isTextFileAsset({ format }) === false) {
    return;
  }
  return new File([format === "json" ? "{}\n" : ""], name, {
    type: getMimeTypeByExtension(format),
  });
};

export const createTextFile = async ({
  name,
  folderId,
  upload = uploadSingleAsset,
}: {
  name: string;
  folderId?: string;
  upload?: typeof uploadSingleAsset;
}): Promise<Asset | undefined> => {
  const file = createTextFileData(name);
  if (file === undefined) {
    return;
  }
  return upload("file", file, { folderId, deduplicate: false });
};

const stopEscapePropagation = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.stopPropagation();
  }
};

export const CreateTextFileDialog = ({
  open,
  folderId,
  defaultName = "untitled.md",
  allowedExtensions,
  title = "New text file",
  disabled = false,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  folderId?: string;
  defaultName?: string;
  allowedExtensions?: readonly string[];
  title?: string;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (assetId: string) => void;
}) => {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (open) {
      setName(defaultName);
      setError(undefined);
      setCreating(false);
    }
  }, [defaultName, open]);

  const normalizedName = name.trim();
  const submit = async () => {
    if (creating || disabled) {
      return;
    }
    const validationError = getTextFileNameError({
      name: normalizedName,
      assets: $assets.get().values(),
      allowedExtensions,
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
        ref={dialogContentRef}
        minWidth={360}
        aria-describedby={undefined}
        onKeyDown={stopEscapePropagation}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (disabled) {
            dialogContentRef.current?.focus();
            return;
          }
          const focusName = () => nameInputRef.current?.focus();
          focusName();
          requestAnimationFrame(focusName);
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <Grid gap={3} css={{ padding: theme.panel.padding }}>
          <Grid gap={1}>
            <Label htmlFor="asset-text-file-name">File name</Label>
            <InputField
              id="asset-text-file-name"
              inputRef={nameInputRef}
              disabled={creating || disabled}
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
            <Button
              color="primary"
              disabled={creating || disabled}
              onClick={() => void submit()}
            >
              {creating ? "Creating…" : "Create file"}
            </Button>
          </Flex>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};
