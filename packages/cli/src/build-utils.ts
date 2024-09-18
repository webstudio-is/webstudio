import { PROJECT_TEMPLATES, INTERNAL_TEMPLATES } from "./config";

export const mapToTemplatesFromOptions = (values: string[]) => {
  const templates: string[] = [];
  for (const value of values) {
    const template =
      PROJECT_TEMPLATES.find((item) => item.value === value) ??
      INTERNAL_TEMPLATES.find((item) => item.value === value);

    if (template == null) {
      templates.push(value);
      continue;
    }

    if ("expand" in template && template.expand != null) {
      templates.push(...template.expand);
      continue;
    }

    templates.push(value);
  }

  return templates;
};
