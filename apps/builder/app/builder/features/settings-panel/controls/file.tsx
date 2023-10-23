import { type ReactNode } from "react";
import { Flex, InputField, theme, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  VerticalLayout,
  useLocalValue,
  Label,
} from "../shared";
import { SelectAsset } from "./select-asset";

type FileControlProps = ControlProps<"file", "asset" | "string">;

const UrlInput = ({
  id,
  localValue,
}: {
  id: string;
  localValue: ReturnType<typeof useLocalValue<undefined | string>>;
}) => (
  <InputField
    id={id}
    value={localValue.value ?? ""}
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
  <Flex css={{ height: theme.spacing[13] }} align="center">
    {children}
  </Flex>
);

export const FileControl = ({
  meta,
  prop,
  propName,
  deletable,
  onChange,
  onDelete,
}: FileControlProps) => {
  const id = useId();

  const localStringValue = useLocalValue(
    // use undefined for asset type to not delete
    // when url is reset by asset selector
    prop?.type === "string" ? prop.value : undefined,
    (value) => {
      if (value === undefined) {
        return;
      } else if (value === "") {
        onDelete();
      } else {
        onChange({ type: "string", value });
      }
    }
  );

  return (
    <VerticalLayout
      label={
        <Label htmlFor={id} description={meta.description}>
          {getLabel(meta, propName)}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <Row>
        <UrlInput id={id} localValue={localStringValue} />
      </Row>
      <Row>
        <SelectAsset
          prop={prop?.type === "asset" ? prop : undefined}
          accept={meta.accept}
          onChange={onChange}
          onDelete={onDelete}
        />
      </Row>
    </VerticalLayout>
  );
};
