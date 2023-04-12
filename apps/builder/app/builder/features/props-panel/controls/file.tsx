import { type ReactNode } from "react";
import { Flex, InputField, theme, useId } from "@webstudio-is/design-system";
import {
  type ControlProps,
  getLabel,
  VerticalLayout,
  useLocalValue,
} from "../shared";
import { SelectAsset } from "./select-asset";

type FileControlProps = ControlProps<"file", "asset" | "string">;

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
  <Flex css={{ height: theme.spacing[13] }} align="center">
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
        <SelectAsset
          prop={prop?.type === "asset" ? prop : undefined}
          accept={meta.accept}
          onChange={onChange}
          onSoftDelete={onSoftDelete}
          disabled={localStringValue.value !== ""}
        />
      </Row>
    </VerticalLayout>
  );
};
