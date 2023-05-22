import type { ControlProps } from "../shared";
import { TextControl } from "./text";

export const CodeControl = ({
  instanceId,
  meta,
  prop,
  propName,
  onChange,
  onDelete,
  onSoftDelete,
}: ControlProps<"code", "string">) => {
  return (
    <TextControl
      instanceId={instanceId}
      meta={{
        ...meta,
        control: "text",
      }}
      prop={prop}
      propName={propName}
      onChange={(value) => {
        if (value.type === "string") {
          // sanitize html before saving
          const div = document.createElement("div");
          div.innerHTML = value.value;
          onChange({ type: "string", value: div.innerHTML });
        } else {
          onChange(value);
        }
      }}
      onDelete={onDelete}
      onSoftDelete={onSoftDelete}
    />
  );
};
