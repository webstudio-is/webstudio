import { Form, FormEncType, FormMethod, useActionData } from "@remix-run/react";
import ObjectID from "bson-objectid";
import { ChangeEvent, useEffect, useRef } from "react";
import { Button, Flex, Text, toast } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";
import {
  MAX_UPLOAD_SIZE,
  toBytes,
  type AssetType,
} from "@webstudio-is/asset-uploader";
import type { ActionData, PreviewAsset } from "./types";
import { FONT_MIME_TYPES } from "@webstudio-is/fonts";
import { useSerialSubmit } from "./use-serial-submit";

const toPreviewAssets = (formData: FormData): Promise<PreviewAsset[]> => {
  const assets: Array<Promise<PreviewAsset>> = [];

  for (const entry of formData) {
    const file = entry[1] as File;
    const promise: Promise<PreviewAsset> = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        const dataUri = event?.target?.result;
        if (dataUri === undefined) {
          return reject(new Error(`Could not read file "${file.name}"`));
        }

        resolve({
          format: file.type.split("/")[1],
          path: String(dataUri),
          name: file.name,
          id: ObjectID().toString(),
          status: "uploading",
        });
      });
      reader.readAsDataURL(file);
    });
    assets.push(promise);
  }

  return Promise.all(assets);
};

const maxSize = toBytes(MAX_UPLOAD_SIZE);

const useUpload = ({
  onSubmit,
  onActionData,
  type,
}: {
  onActionData: (data: ActionData) => void;
  onSubmit: (assets: Array<PreviewAsset>) => void;
  type: AssetType;
}) => {
  const submit = useSerialSubmit();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const actionData: ActionData | undefined = useActionData();

  const onChange = (event: ChangeEvent<HTMLFormElement>) => {
    const files = Array.from(inputRef?.current?.files ?? []);
    if (files.length !== 0) {
      const form = event.currentTarget;
      const formData = new FormData();
      for (const file of files) {
        if (file.size > maxSize) {
          toast.error(
            `Asset "${file.name}" cannot be bigger than ${MAX_UPLOAD_SIZE}MB`
          );
          continue;
        }
        formData.append(type, file, file.name);
      }
      const options = {
        method: form.method as FormMethod,
        action: form.action,
        encType: form.enctype as FormEncType,
      };
      submit(formData, options);
      toPreviewAssets(formData)
        .then(onSubmit)
        .catch((error: unknown) => {
          if (error instanceof Error) {
            toast.error(error.message);
          }
        });
      form.reset();
    }
  };

  useEffect(() => {
    if (actionData !== undefined) {
      onActionData(actionData);
    }
  }, [actionData, onActionData]);

  return { inputRef, onChange };
};

const acceptMap = {
  image: "image/*",
  font: FONT_MIME_TYPES,
};

type AssetUploadProps = {
  onActionData: (data: ActionData) => void;
  onSubmit: (assets: Array<PreviewAsset>) => void;
  type: AssetType;
};

export const AssetUpload = ({
  onSubmit,
  onActionData,
  type,
}: AssetUploadProps) => {
  const { inputRef, onChange } = useUpload({ onSubmit, onActionData, type });
  return (
    <Flex
      as={Form}
      css={{ flexGrow: 1 }}
      method="post"
      encType="multipart/form-data"
      onChange={onChange}
    >
      <input
        accept={acceptMap[type]}
        type="file"
        name={type}
        multiple
        ref={inputRef}
        style={{ display: "none" }}
      />
      <Button
        variant="blue"
        type="button"
        onClick={() => inputRef?.current?.click()}
        size={2}
        css={{ flexGrow: 1 }}
      >
        <Flex align="center" gap={1}>
          <UploadIcon />
          <Text>Upload</Text>
        </Flex>
      </Button>
    </Flex>
  );
};
