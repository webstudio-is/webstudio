import { useStore } from "@nanostores/react";
import { Button, InputField, Flex } from "@webstudio-is/design-system";
import { $assets } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import type { ControlProps } from "../types";
import { useEffect, useState } from "react";
import type { InvalidValue } from "@webstudio-is/css-engine";

const isValidURL = (value: string) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

export const ImageControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const assets = useStore($assets);
  const setValue = setProperty(property);
  const styleValue = currentStyle[property]?.value;
  const [remoteImageURL, setRemoteImageURL] = useState<
    IntermediateValue | InvalidValue | undefined
  >(undefined);

  useEffect(() => {
    if (styleValue?.type === "image" && styleValue.value.type === "url") {
      setRemoteImageURL({ type: "intermediate", value: styleValue.value.url });
    }

    if (styleValue?.type === "image" && styleValue.value.type === "asset") {
      setRemoteImageURL(undefined);
    }
  }, [styleValue]);

  if (styleValue === undefined) {
    return;
  }

  const asset =
    styleValue.type === "image" && styleValue.value.type === "asset"
      ? assets.get(styleValue.value.value)
      : undefined;

  const handleImageURLInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (isValidURL(value) === true) {
      setRemoteImageURL({ type: "intermediate", value });
    } else {
      setRemoteImageURL({ type: "invalid", value });
    }
  };

  const handleImageURLComplete = () => {
    if (
      remoteImageURL?.type === "intermediate" &&
      isValidURL(remoteImageURL.value) === true
    ) {
      setValue({
        type: "image",
        value: { type: "url", url: remoteImageURL.value },
      });
      setRemoteImageURL(undefined);
    }
  };

  return (
    <Flex direction="column" gap="2">
      <InputField
        type="text"
        color={remoteImageURL?.type === "invalid" ? "error" : undefined}
        placeholder="Enter image URL..."
        value={remoteImageURL?.value ?? ""}
        onChange={handleImageURLInput}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleImageURLComplete();
          }
        }}
        onBlur={handleImageURLComplete}
      />
      <FloatingPanel
        title="Images"
        content={
          <ImageManager
            onChange={(assetId) => {
              setValue({
                type: "image",
                value: { type: "asset", value: assetId },
              });
            }}
          />
        }
      >
        <Button
          color="neutral"
          css={{ maxWidth: "100%", justifySelf: "right" }}
        >
          {asset?.name ?? "Choose image..."}
        </Button>
      </FloatingPanel>
    </Flex>
  );
};
