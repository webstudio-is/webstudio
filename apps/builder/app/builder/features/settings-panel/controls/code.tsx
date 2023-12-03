import type { ControlProps } from "../shared";
import { TextControl } from "./text";

export const CodeControl = ({
  instanceId,
  meta,
  prop,
  propName,
  deletable,
  readOnly,
  onChange,
  onDelete,
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
      readOnly={readOnly}
      deletable={deletable}
      onChange={(value) => {
        if (value.type === "string") {
          // sanitize html before saving
          // this is basically what browser does when innerHTML is set
          // but isolated within temporary element
          // so the result is correct markup
          const div = document.createElement("div");
          div.innerHTML = value.value;
          onChange({ type: "string", value: div.innerHTML });
        } else {
          onChange(value);
        }
      }}
      onDelete={onDelete}
    />
  );
};
