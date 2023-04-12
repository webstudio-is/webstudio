import { useMemo, type ReactNode } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  Flex,
  InputField,
  SmallIconButton,
  Text,
  theme,
  useId,
} from "@webstudio-is/design-system";
import { assetsStore } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import {
  type ControlProps,
  getLabel,
  VerticalLayout,
  useLocalValue,
} from "../shared";
import { acceptToMimeCategories } from "@webstudio-is/asset-uploader";
import { TrashIcon } from "@webstudio-is/icons";

type FileControlProps = ControlProps<"file", "asset" | "string">;

// tests whether we can use ImageManager for the given "accept" value
const isImageAccept = (accept?: string) => {
  const acceptCategories = acceptToMimeCategories(accept || "");
  return (
    acceptCategories === "*" ||
    (acceptCategories.size === 1 && acceptCategories.has("image"))
  );
};

const SelectAssetButton = ({
  prop,
  meta,
  onChange,
  disabled,
}: Pick<FileControlProps, "prop" | "meta" | "onChange"> & {
  disabled: boolean;
}) => {
  const assetStore = useMemo(
    () =>
      computed(assetsStore, (assets) =>
        prop?.type === "asset" ? assets.get(prop.value) : undefined
      ),
    [prop]
  );

  const asset = useStore(assetStore);

  if (isImageAccept(meta?.accept) === false) {
    return (
      <Text color="destructive">Unsupported accept value: {meta?.accept}</Text>
    );
  }

  return (
    <FloatingPanel
      title="Images"
      content={
        <ImageManager
          onChange={(asset) =>
            onChange({ type: "asset", value: asset.id }, asset)
          }
          accept={meta?.accept}
        />
      }
    >
      <Button color="neutral" css={{ flex: 1 }} disabled={disabled}>
        {asset?.name ?? "Choose source"}
      </Button>
    </FloatingPanel>
  );
};

const UrlInput = ({
  id,
  disabled,
  localValue,
}: {
  id: string;
  disabled: boolean;
  localValue: ReturnType<typeof useLocalValue<string>>;
}) => (
  <InputField
    disabled={disabled}
    id={id}
    value={localValue.value}
    placeholder="http://www.url.com"
    onChange={(event) => localValue.set(event.target.value)}
    onBlur={localValue.save}
    onKeyDown={(event) => {
      if (event.key === "Enter") {
        localValue.save();
      }
    }}
    css={{ width: "100%" }}
  />
);

const Row = ({ children }: { children: ReactNode }) => (
  <Flex
    css={{ height: theme.spacing[13], gap: theme.spacing[5] }}
    align="center"
    justify="between"
  >
    {children}
  </Flex>
);

export const FileControl = ({
  meta,
  prop,
  propName,
  onChange,
  onDelete,
  onSoftDelete,
}: FileControlProps) => {
  const id = useId();

  const localStringValue = useLocalValue(
    prop?.type === "string" ? prop.value : "",
    (value) => {
      if (value === "") {
        onSoftDelete();
      } else {
        onChange({ type: "string", value });
      }
    }
  );

  return (
    <VerticalLayout
      label={getLabel(meta, propName)}
      onDelete={onDelete}
      id={id}
    >
      <Row>
        <UrlInput
          id={id}
          disabled={prop?.type === "asset"}
          localValue={localStringValue}
        />
      </Row>
      <Row>
        <SelectAssetButton
          prop={prop}
          meta={meta}
          onChange={onChange}
          disabled={localStringValue.value !== ""}
        />
        {prop?.type === "asset" ? (
          <SmallIconButton
            icon={<TrashIcon />}
            onClick={onSoftDelete}
            variant="destructive"
          />
        ) : null}
      </Row>
    </VerticalLayout>
  );
};
