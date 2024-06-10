import { type ChangeEvent, useRef } from "react";
import { useStore } from "@nanostores/react";
import { Button, Flex, Tooltip, toast } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";
import {
  type AssetType,
  MAX_UPLOAD_SIZE,
  toBytes,
} from "@webstudio-is/asset-uploader";
import { FONT_MIME_TYPES } from "@webstudio-is/fonts";
import { useUploadAsset } from "./use-assets";
import { $authPermit } from "~/shared/nano-states";
import { imageMimeTypes } from "./image-formats";

const maxSize = toBytes(MAX_UPLOAD_SIZE);

const getFilesFromInput = (_type: AssetType, input: HTMLInputElement) => {
  const files = Array.from(input?.files ?? []);

  const exceedSizeFiles = files.filter((file) => file.size > maxSize);

  for (const file of exceedSizeFiles) {
    toast.error(
      `Asset "${file.name}" cannot be bigger than ${MAX_UPLOAD_SIZE}MB`
    );
  }

  return files.filter((file) => file.size <= maxSize);
};

const useUpload = (type: AssetType) => {
  const uploadAsset = useUploadAsset();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChange = (event: ChangeEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    const files = getFilesFromInput(type, input);
    uploadAsset(type, files);
    form.reset();
  };

  return { inputRef, onChange };
};

const acceptMap = {
  image: imageMimeTypes.join(", "),
  font: FONT_MIME_TYPES,
};

// https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept#unique_file_type_specifiers
export const acceptFileTypeSpecifier = (specifiers: string, file: File) => {
  const specifierArray = specifiers
    .split(",")
    .map((specifier) => specifier.trim());

  return specifierArray.some((specifier) => {
    if (specifier.startsWith(".")) {
      return file.name.endsWith(specifier);
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
    acceptFileTypeSpecifier(accept, file);
  }

  return acceptFileTypeSpecifier(acceptMap[assetType], file);
};

type AssetUploadProps = {
  type: AssetType;
  accept?: string;
};

const EnabledAssetUpload = ({ accept, type }: AssetUploadProps) => {
  const { inputRef, onChange } = useUpload(type);

  return (
    <form onChange={onChange}>
      <Flex>
        <input
          accept={accept ?? acceptMap[type]}
          type="file"
          name={type}
          multiple
          ref={inputRef}
          style={{ display: "none" }}
        />
        <Button
          type="button"
          onClick={() => inputRef?.current?.click()}
          css={{ flexGrow: 1 }}
          prefix={<UploadIcon />}
        >
          Upload
        </Button>
      </Flex>
    </form>
  );
};

export const AssetUpload = ({ type }: AssetUploadProps) => {
  const authPermit = useStore($authPermit);

  if (authPermit !== "view") {
    // Split into a separate component to avoid using `useUpload` hook unnecessarily
    // (It's hard to mock this hook in storybook)
    return <EnabledAssetUpload type={type} />;
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
};
