import type { GeneratedTemplateMeta } from "@webstudio-is/template";

export const getComponentTemplatesForPicker = (
  templates: ReadonlyMap<string, GeneratedTemplateMeta>,
  showNewForm: boolean
) => {
  const pickerTemplates = new Map(templates);
  const formTemplate = pickerTemplates.get("form");

  if (showNewForm && formTemplate) {
    pickerTemplates.set("form", { ...formTemplate, label: "Form (new)" });
  } else {
    pickerTemplates.delete("form");
  }

  return pickerTemplates;
};
