import {
  isFormSubmission,
  resolveManagedFormErrorSlot,
} from "@webstudio-is/sdk";
import {
  browserInfoParameterName,
  formDataParameterName,
} from "@webstudio-is/sdk/runtime";
import {
  generateJsxChildren,
  generateWebstudioComponent,
  type ComponentGenerationPolicy,
} from "./component-generator";

const managedFormPolicy: ComponentGenerationPolicy = {
  transformProps: (instance, props) => {
    if (instance.component !== "NativeForm") {
      return;
    }
    for (const [name, prop] of props) {
      if (prop.name.toLowerCase() === "data-ws-managed-form-id") {
        props.delete(name);
      }
    }
    const action = props.get("action");
    if (action?.type === "json" && isFormSubmission(action.value)) {
      return `\ndata-ws-managed-form-id=${JSON.stringify(instance.id)}`;
    }
  },
  resolveInstance: resolveManagedFormErrorSlot,
  renderResolvedExpression: (expression, helpers) => {
    helpers?.add("renderText");
    helpers?.add("formatManagedFormErrors");
    return `{renderText(formatManagedFormErrors(${expression}))}\n`;
  },
  declareDataSource: (dataSource, valueName, instances) => {
    if (
      dataSource.type === "parameter" &&
      (dataSource.name === formDataParameterName ||
        dataSource.name === browserInfoParameterName) &&
      instances.get(dataSource.scopeInstanceId ?? "")?.component ===
        "NativeForm"
    ) {
      // Submission values exist only while a managed submit runs.
      return `const ${valueName}: any = undefined\n`;
    }
  },
};

export const generateManagedFormJsxChildren = (
  options: Omit<Parameters<typeof generateJsxChildren>[0], "policy"> & {
    excludePlaceholders?: boolean;
  }
) => {
  const { excludePlaceholders, ...childrenOptions } = options;
  return generateJsxChildren({
    ...childrenOptions,
    policy: excludePlaceholders
      ? {
          ...managedFormPolicy,
          skipText: (child) => child.placeholder === true,
        }
      : managedFormPolicy,
  });
};

export const generateManagedFormComponent = (
  options: Omit<Parameters<typeof generateWebstudioComponent>[0], "policy">
) => generateWebstudioComponent({ ...options, policy: managedFormPolicy });
