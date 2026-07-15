import { useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
  type PageTemplate,
  type Page,
  type Pages,
  isLiteralExpression,
} from "@webstudio-is/sdk";
import {
  Button,
  DialogClose,
  DialogTitleActions,
  TitleSuffixSpacer,
} from "@webstudio-is/design-system";
import { $isContentMode, $isDesignMode } from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { isContentModePagePath } from "@webstudio-is/project-build/runtime";
import type { BuilderRuntimeOperationInput } from "@webstudio-is/project-build/runtime";
import {
  nameToPath,
  pageSettingsDefaultValues,
  pageTemplateSettingsInput,
  validatePageSettings,
  type PageSettingsErrors,
  type PageSettingsValues,
} from "@webstudio-is/project-build/runtime";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import {
  $pageRootScope,
  duplicateTemplate,
  instantiateTemplate,
} from "./page-utils";
import {
  canEditPagePathInMode,
  addContentModePathError,
  updatePage,
  FormFields,
  PageSettingsPanel,
} from "./page-settings/page-settings";
import type { OnChange } from "./page-settings/shared";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { copyTemplate } from "~/shared/copy-paste/copy-paste";
import { PageItemActionsDropdown } from "./page-item-actions";

const validateTemplateValues = (
  values: PageSettingsValues
): PageSettingsErrors => {
  const result = pageTemplateSettingsInput.safeParse(values);
  if (result.success) {
    return {};
  }
  return result.error.flatten().fieldErrors;
};

const templateFieldDefaultValues: PageSettingsValues = {
  ...pageSettingsDefaultValues,
  name: "Untitled Template",
  path: "",
  excludePageFromSearch: "false",
};

const emptyUnsavedValues: Partial<PageSettingsValues> = {};

const getTemplateMetaFromValues = (
  values: Partial<PageSettingsValues>
): BuilderRuntimeOperationInput<"pageTemplates.create">["meta"] => ({
  description: values.description,
  excludePageFromSearch:
    values.excludePageFromSearch === undefined
      ? undefined
      : values.excludePageFromSearch === "true",
  language: values.language,
  socialImageUrl: values.socialImageUrl,
  socialImageAssetId: values.socialImageAssetId,
  custom: values.customMetas,
});

const createTemplate = (values: PageSettingsValues) =>
  executeRuntimeMutation({
    id: "pageTemplates.create",
    input: {
      name: values.name,
      title: values.title,
      meta: getTemplateMetaFromValues(values),
    },
  })?.result.templateId;

const updateTemplate = (
  templateId: PageTemplate["id"],
  values: Partial<PageSettingsValues>
) => {
  executeRuntimeMutation({
    id: "pageTemplates.update",
    input: {
      templateId,
      values: {
        name: values.name,
        title: values.title,
        meta: getTemplateMetaFromValues(values),
      },
    },
  });
};

export const NewTemplateSettings = ({
  onSuccess,
}: {
  onSuccess: (templateId: PageTemplate["id"]) => void;
}) => {
  const [values, setValues] = useState<PageSettingsValues>(
    templateFieldDefaultValues
  );
  const errors = validateTemplateValues(values);

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const templateId = createTemplate(values);
      if (templateId !== undefined) {
        onSuccess(templateId);
      }
    }
  };

  return (
    <NewTemplateSettingsView onSubmit={handleSubmit} isSubmitting={false}>
      <TemplateFormFields
        autoSelect
        errors={errors}
        values={values}
        onChange={(change) =>
          setValues((prev) => ({ ...prev, [change.field]: change.value }))
        }
      />
    </NewTemplateSettingsView>
  );
};

const NewTemplateSettingsView = ({
  onSubmit,
  isSubmitting,
  children,
}: {
  onSubmit: () => void;
  isSubmitting: boolean;
  children: JSX.Element;
}) => {
  return (
    <PageSettingsPanel
      title="New template settings"
      onSubmit={onSubmit}
      suffix={
        <DialogTitleActions>
          <TitleSuffixSpacer />
          <Button
            state={isSubmitting ? "pending" : "auto"}
            onClick={onSubmit}
            tabIndex={2}
          >
            {isSubmitting ? "Creating" : "Create template"}
          </Button>
          <DialogClose />
        </DialogTitleActions>
      }
    >
      {children}
    </PageSettingsPanel>
  );
};

export const TemplateSettings = ({
  onClose,
  onDuplicate,
  onDelete,
  templateId,
}: {
  onClose: () => void;
  onDuplicate: (newTemplateId: string) => void;
  onDelete?: () => void;
  templateId: string;
}) => {
  const pages = useStore($pages);
  const template = pages?.pageTemplates?.get(templateId);

  let errors: PageSettingsErrors = {};
  const { value: unsavedValues, set: setUnsavedValues } = useDraftValue<
    Partial<PageSettingsValues>
  >(
    emptyUnsavedValues,
    (values) => {
      updateTemplate(templateId, values);
    },
    {
      resetOnSave: true,
      shouldSave: () => Object.keys(errors).length === 0,
    }
  );

  const handleChange: OnChange = (event) => {
    setUnsavedValues((values) => ({
      ...values,
      [event.field]: event.value,
    }));
  };

  const values: PageSettingsValues = {
    ...(template
      ? {
          ...templateFieldDefaultValues,
          name: template.name,
          title: template.title,
          description:
            template.meta.description ?? templateFieldDefaultValues.description,
          excludePageFromSearch:
            template.meta.excludePageFromSearch ??
            templateFieldDefaultValues.excludePageFromSearch,
          language:
            template.meta.language ?? templateFieldDefaultValues.language,
          socialImageUrl:
            template.meta.socialImageUrl ??
            templateFieldDefaultValues.socialImageUrl,
          socialImageAssetId:
            template.meta.socialImageAssetId ??
            templateFieldDefaultValues.socialImageAssetId,
          customMetas:
            template.meta.custom ?? templateFieldDefaultValues.customMetas,
        }
      : templateFieldDefaultValues),
    ...unsavedValues,
  };

  errors = validateTemplateValues(values);

  if (template === undefined) {
    return null;
  }

  return (
    <TemplateSettingsView
      onClose={onClose}
      onCopy={() => {
        void copyTemplate(templateId);
      }}
      onDelete={onDelete}
      onDuplicate={() => {
        const newId = duplicateTemplate(templateId);
        if (newId !== undefined) {
          onDuplicate(newId);
        }
      }}
    >
      <TemplateFormFields
        errors={errors}
        values={values}
        onChange={handleChange}
      />
    </TemplateSettingsView>
  );
};

const TemplateSettingsView = ({
  onCopy,
  onDelete,
  onDuplicate,
  onClose,
  children,
}: {
  onCopy: () => void;
  onDelete?: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  children: JSX.Element;
}) => {
  const isDesignMode = useStore($isDesignMode);
  return (
    <PageSettingsPanel
      title="Template settings"
      onSubmit={onClose}
      disabled={!isDesignMode}
      suffix={
        <DialogTitleActions>
          {isDesignMode && (
            <PageItemActionsDropdown
              label="Template actions"
              actions={{
                copy: onCopy,
                duplicate: onDuplicate,
                delete: onDelete,
              }}
            />
          )}
          <DialogClose />
        </DialogTitleActions>
      }
    >
      {children}
    </PageSettingsPanel>
  );
};

const TemplateFormFields = ({
  autoSelect,
  errors,
  values,
  onChange,
}: {
  autoSelect?: boolean;
  errors: PageSettingsErrors;
  values: PageSettingsValues;
  onChange: OnChange;
}) => (
  <FormFields
    autoSelect={autoSelect}
    errors={errors}
    values={values}
    nameLabel="Template name"
    showHomePageControl={false}
    showPathField={false}
    showStatusField={false}
    showRedirectField={false}
    showDocumentTypeField={false}
    showAuthSection={false}
    showTextContentSection={false}
    showMarketplaceSection={false}
    onChange={onChange}
  />
);

const toFormValuesFromTemplate = (
  template: PageTemplate,
  pages: Pages | undefined
): PageSettingsValues => ({
  ...pageSettingsDefaultValues,
  name: template.name,
  parentFolderId:
    pages?.rootFolderId ?? pageSettingsDefaultValues.parentFolderId,
  path: nameToPath(pages, template.name),
  title: template.title,
  description:
    template.meta.description ?? pageSettingsDefaultValues.description,
  excludePageFromSearch:
    template.meta.excludePageFromSearch ??
    pageSettingsDefaultValues.excludePageFromSearch,
  language: template.meta.language ?? pageSettingsDefaultValues.language,
  socialImageUrl:
    template.meta.socialImageUrl ?? pageSettingsDefaultValues.socialImageUrl,
  socialImageAssetId:
    template.meta.socialImageAssetId ??
    pageSettingsDefaultValues.socialImageAssetId,
  customMetas: template.meta.custom ?? pageSettingsDefaultValues.customMetas,
});

const getEditorCreatePageValues = (
  initialValues: PageSettingsValues,
  values: PageSettingsValues
): Partial<PageSettingsValues> => {
  const allowedValues: Partial<PageSettingsValues> = {
    name: values.name,
  };

  if (isContentModePagePath(initialValues.path)) {
    allowedValues.path = values.path;
  }
  if (isLiteralExpression(initialValues.title)) {
    allowedValues.title = values.title;
  }
  if (isLiteralExpression(initialValues.description)) {
    allowedValues.description = values.description;
  }
  if (isLiteralExpression(initialValues.excludePageFromSearch)) {
    allowedValues.excludePageFromSearch = values.excludePageFromSearch;
  }
  if (isLiteralExpression(initialValues.language)) {
    allowedValues.language = values.language;
  }
  if (isLiteralExpression(initialValues.socialImageUrl)) {
    allowedValues.socialImageUrl = values.socialImageUrl;
    allowedValues.socialImageAssetId = values.socialImageAssetId;
  }
  allowedValues.customMetas = values.customMetas;

  return allowedValues;
};

export const __testing__ = {
  getEditorCreatePageValues,
};

export const CreatePageFromTemplateSettings = ({
  templateId,
  onSuccess,
}: {
  templateId: PageTemplate["id"];
  onSuccess: (pageId: Page["id"]) => void;
}) => {
  const pages = useStore($pages);
  const isContentMode = useStore($isContentMode);
  const isDesignMode = useStore($isDesignMode);
  const template = pages?.pageTemplates?.get(templateId);
  const { variableValues } = useStore($pageRootScope);

  const [initialValues] = useState<PageSettingsValues>(() =>
    template
      ? toFormValuesFromTemplate(template, pages)
      : {
          ...pageSettingsDefaultValues,
          path: nameToPath(pages, pageSettingsDefaultValues.name),
        }
  );
  const [values, setValues] = useState<PageSettingsValues>(initialValues);

  const errors = validatePageSettings({
    pages,
    pageId: undefined,
    values,
    variableValues,
  });
  addContentModePathError({ errors, isContentMode, path: values.path });

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const newPageId = instantiateTemplate({
        templateId,
        overrides: { name: values.name, path: values.path },
        folderId: values.parentFolderId,
        contentMode: isContentMode,
      });
      if (newPageId) {
        updatePage(
          newPageId,
          isContentMode
            ? getEditorCreatePageValues(initialValues, values)
            : values
        );
        onSuccess(newPageId);
      }
    }
  };

  if (template === undefined) {
    return null;
  }

  return (
    <PageSettingsPanel
      title="Create page from template"
      onSubmit={handleSubmit}
      suffix={
        <DialogTitleActions>
          <TitleSuffixSpacer />
          <Button onClick={handleSubmit} tabIndex={2}>
            Create page
          </Button>
          <DialogClose />
        </DialogTitleActions>
      }
    >
      <FormFields
        autoSelect
        errors={errors}
        values={values}
        isEditorContext={isContentMode}
        canEditName
        canEditPath={canEditPagePathInMode({
          isDesignMode,
          isContentMode,
          path: initialValues.path,
        })}
        onChange={(change) => {
          setValues((prev) => {
            const next = { ...prev, [change.field]: change.value };
            if (change.field === "name") {
              if (prev.path === nameToPath(pages, prev.name)) {
                next.path = nameToPath(pages, change.value as string);
              }
            }
            return next;
          });
        }}
      />
    </PageSettingsPanel>
  );
};
