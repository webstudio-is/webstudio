import {
  forwardRef,
  type ChangeEvent,
  useImperativeHandle,
  useRef,
} from "react";
import { useStore } from "@nanostores/react";
import { Button, Flex, Tooltip, toast } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";
import { IMAGE_MIME_TYPES, detectAssetType } from "@webstudio-is/sdk";
import { MAX_UPLOAD_SIZE, toBytes } from "@webstudio-is/asset-uploader";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { FONT_MIME_TYPES } from "@webstudio-is/fonts";
import { uploadAssets } from "./upload-assets";
import { $authPermit } from "~/shared/nano-states";

const maxSize = toBytes(MAX_UPLOAD_SIZE);

export const validateFiles = (files: File[]) => {
  const exceedSizeFiles = files.filter((file) => file.size > maxSize);
  for (const file of exceedSizeFiles) {
    toast.error(
      `Asset "${file.name}" cannot be bigger than ${MAX_UPLOAD_SIZE}MB`
    );
  }
  return files.filter((file) => file.size <= maxSize);
};

export const groupFilesByAssetType = (files: readonly File[]) => {
  const filesByType = new Map<AssetType, File[]>();
  for (const file of files) {
    const type = detectAssetType(file.name);
    const groupedFiles = filesByType.get(type) ?? [];
    groupedFiles.push(file);
    filesByType.set(type, groupedFiles);
  }
  return filesByType;
};

const useUpload = (folderId?: string) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChange = (event: ChangeEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    const files = validateFiles(Array.from(input?.files ?? []));

    for (const [detectedType, filesOfType] of groupFilesByAssetType(files)) {
      uploadAssets(detectedType, filesOfType, { folderId });
    }

    form.reset();
  };

  return { inputRef, onChange };
};

const acceptMap = {
  image: IMAGE_MIME_TYPES.join(", "),
  font: FONT_MIME_TYPES,
  video: undefined, // Videos can be uploaded through file type
  // We allow everything by default for files, specific validation happens serverside
  file: undefined,
};

// https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept#unique_file_type_specifiers
export const acceptFileTypeSpecifier = (specifiers: string, file: File) => {
  const specifierArray = specifiers
    .split(",")
    .map((specifier) => specifier.trim());

  return specifierArray.some((specifier) => {
    if (specifier === "*") {
      return true;
    }

    if (specifier.startsWith(".")) {
      return file.name.endsWith(specifier);
    }

    if (specifier.endsWith("/*")) {
      const mimeCategory = specifier.slice(0, -2);
      return file.type.startsWith(mimeCategory + "/");
    }

    return specifier === file.type;
  });
};

export const acceptUploadType = (
  assetType: AssetType,
  accept: string | undefined,
  file: File
) => {
  if (accept !== undefined) {
    return acceptFileTypeSpecifier(accept, file);
  }

  const accepted = acceptMap[assetType];
  if (accepted === undefined) {
    return true;
  }

  return acceptFileTypeSpecifier(accepted, file);
};

type AssetUploadProps = {
  type: AssetType;
  accept?: string;
  folderId?: string;
  showTrigger?: boolean;
};

export type AssetUploadHandle = {
  open: () => void;
};

const EnabledAssetUpload = forwardRef<AssetUploadHandle, AssetUploadProps>(
  ({ accept, type, folderId, showTrigger = true }, forwardedRef) => {
    const { inputRef, onChange } = useUpload(folderId);
    useImperativeHandle(forwardedRef, () => ({
      open: () => inputRef.current?.click(),
    }));

    return (
      <form onChange={onChange}>
        <input
          accept={accept ?? acceptMap[type]}
          type="file"
          name={type}
          multiple
          ref={inputRef}
          style={{ display: "none" }}
        />
        {showTrigger && (
          <Button
            aria-label="Upload asset"
            color="ghost"
            type="button"
            onClick={() => inputRef?.current?.click()}
            prefix={<UploadIcon />}
          />
        )}
      </form>
    );
  }
);
EnabledAssetUpload.displayName = "EnabledAssetUpload";

export const AssetUpload = forwardRef<AssetUploadHandle, AssetUploadProps>(
  ({ type, accept, folderId, showTrigger }, forwardedRef) => {
    const authPermit = useStore($authPermit);

    if (authPermit !== "view") {
      // Split into a separate component to avoid using `useUpload` hook unnecessarily
      // (It's hard to mock this hook in storybook)
      return (
        <EnabledAssetUpload
          ref={forwardedRef}
          type={type}
          accept={accept}
          folderId={folderId}
          showTrigger={showTrigger}
        />
      );
    }

    if (showTrigger === false) {
      return null;
    }

    return (
      <Flex>
        <Tooltip side="bottom" content="View mode. You can't upload assets.">
          <Button css={{ flexGrow: 1 }} prefix={<UploadIcon />} disabled={true}>
            Upload
          </Button>
        </Tooltip>
      </Flex>
    );
  }
);
AssetUpload.displayName = "AssetUpload";
