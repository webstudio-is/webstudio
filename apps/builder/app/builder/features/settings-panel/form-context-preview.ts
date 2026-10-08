import {
  findTreeInstanceIds,
  type Instances,
  type Props,
} from "@webstudio-is/sdk";
import { parseJsonExpression } from "@webstudio-is/expression";
import type { ManagedFormBrowserInfo } from "@webstudio-is/sdk/runtime";

/** Builder preview of named controls, available before a visitor submits. */
export const getFormDataPreview = (
  instances: Instances,
  props: Props,
  formId: string
) => {
  const getValue = (instanceId: string, name: string) => {
    const prop = [...props.values()].find(
      (prop) => prop.instanceId === instanceId && prop.name === name
    );
    if (prop?.type === "expression") {
      return parseJsonExpression(prop.value);
    }
    return prop && "value" in prop ? prop.value : undefined;
  };
  const fields: Array<[string, unknown]> = [];
  for (const id of findTreeInstanceIds(instances, formId)) {
    const instance = instances.get(id);
    if (instance === undefined) {
      continue;
    }
    const get = (name: string) => getValue(id, name);
    const tag =
      instance.tag ??
      get("tag") ??
      (
        {
          Input: "input",
          Textarea: "textarea",
          Select: "select",
          Checkbox: "input",
          Radio: "input",
        } as Record<string, string>
      )[instance.component];
    if (!["input", "textarea", "select"].includes(String(tag).toLowerCase())) {
      continue;
    }
    const name = get("name");
    if (typeof name !== "string" || !name || get("disabled") === true) {
      continue;
    }
    const type = String(get("type") ?? "text").toLowerCase();
    if (["button", "submit", "reset"].includes(type)) {
      continue;
    }
    // Keep empty named controls inspectable, including unchecked controls and files.
    let value = type === "file" ? [] : (get("value") ?? get("defaultValue"));
    if (value === undefined && String(tag).toLowerCase() === "select") {
      const options = [...findTreeInstanceIds(instances, id)].filter(
        (optionId) => {
          const option = instances.get(optionId);
          return (
            option?.component === "Option" ||
            String(option?.tag ?? getValue(optionId, "tag")).toLowerCase() ===
              "option"
          );
        }
      );
      const selected = options.filter(
        (optionId) =>
          getValue(optionId, "selected") === true ||
          getValue(optionId, "defaultSelected") === true
      );
      const optionValue = (optionId: string) =>
        getValue(optionId, "value") ??
        instances
          .get(optionId)
          ?.children.map((child) =>
            child.type === "text"
              ? child.value
              : child.type === "expression"
                ? (parseJsonExpression(child.value) ?? "")
                : ""
          )
          .join("") ??
        "";
      value =
        get("multiple") === true
          ? selected.map(optionValue)
          : optionValue(selected.at(-1) ?? options[0] ?? "");
    }
    value ??= "";
    fields.push([name, value]);
  }
  const result = Object.fromEntries(fields);
  for (const [name] of fields) {
    const duplicates = fields.filter(([key]) => key === name);
    if (duplicates.length > 1) {
      result[name] = duplicates.map(([, value]) => value);
    }
  }
  return result;
};

export const getBrowserInfoPreview = (
  serverInfo?: ManagedFormBrowserInfo
): ManagedFormBrowserInfo => ({
  ip: serverInfo?.ip ?? "",
  userAgent:
    serverInfo?.userAgent ??
    (typeof navigator === "undefined" ? "" : navigator.userAgent),
  language:
    serverInfo?.language ??
    (typeof navigator === "undefined" ? "" : navigator.language),
  referrer: serverInfo?.referrer ?? "",
});
