import { nanoid } from "nanoid";
import { z } from "zod";
import { useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
  type PageTemplate,
  PageName,
  PageTitle,
  elementComponent,
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
import { $instances, $pages } from "~/shared/sync/data-stores";
import { isContentModePagePath } from "@webstudio-is/project/content-mode-permissions";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { selectInstance } from "~/shared/nano-states";
import {
  $pageRootScope,
  duplicateTemplate,
  instantiateTemplate,
  nameToPath,
} from "./page-utils";
import {
  fieldDefaultValues,
  canEditPagePathInMode,
  addContentModePathError,
  validateValues,
  updatePage,
  FormFields,
  PageSettingsPanel,
  type Values,
} from "./page-settings/page-settings";
import type { Errors, OnChange } from "./page-settings/shared";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { copyTemplate } from "~/shared/copy-paste/copy-paste";
import { PageItemActionsDropdown } from "./page-item-actions";

const TemplateValues = z.object({
  name: PageName,
  title: PageTitle,
});

const validateTemplateValues = (values: Values): Errors => {
  const result = TemplateValues.safeParse(values);
  if (result.success) {
    return {};
  }
  return result.error.formErrors.fieldErrors;
};

const templateFieldDefaultValues: Values = {
  ...fieldDefaultValues,
  name: "Untitled Template",
  path: "",
  excludePageFromSearch: "false",
};

const emptyUnsavedValues: Partial<Values> = {};

const createTemplate = (templateId: PageTemplate["id"], values: Values) => {
  serverSyncStore.createTransaction(
    [$pages, $instances],
    (pages, instances) => {
      if (pages === undefined) {
        return;
      }
      const rootInstanceId = nanoid();
      pages.pageTemplates ??= new Map();
      pages.pageTemplates.set(templateId, {
        id: templateId,
        name: values.name,
        title: values.title,
        rootInstanceId,
        meta: {
          description: values.description,
          excludePageFromSearch: values.excludePageFromSearch,
          language: values.language,
          socialImageUrl: values.socialImageUrl,
          socialImageAssetId: values.socialImageAssetId,
          custom: values.customMetas,
        },
      });
      instances.set(rootInstanceId, {
        type: "instance",
        id: rootInstanceId,
        component: elementComponent,
        tag: "body",
        children: [],
      });
      selectInstance(undefined);
    }
  );
};

const updateTemplate = (
  templateId: PageTemplate["id"],
  values: Partial<Values>
) => {
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    const template = pages.pageTemplates?.get(templateId);
    if (template === undefined) {
      return;
    }
    if (values.name !== undefined) {
      template.name = values.name;
    }
    if (values.title !== undefined) {
      template.title = values.title;
    }
    if (values.description !== undefined) {
      template.meta.description = values.description;
    }
    if (values.excludePageFromSearch !== undefined) {
      template.meta.excludePageFromSearch = values.excludePageFromSearch;
    }
    if (values.language !== undefined) {
      template.meta.language = values.language;
    }
    if (values.socialImageUrl !== undefined) {
      template.meta.socialImageUrl = values.socialImageUrl;
    }
    if (values.socialImageAssetId !== undefined) {
      template.meta.socialImageAssetId = values.socialImageAssetId;
    }
    if (values.customMetas !== undefined) {
      template.meta.custom = values.customMetas;
    }
  });
};

export const NewTemplateSettings = ({
  onSuccess,
}: {
  onSuccess: (templateId: PageTemplate["id"]) => void;
}) => {
  const [values, setValues] = useState<Values>(templateFieldDefaultValues);
  const errors = validateTemplateValues(values);

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const templateId = nanoid();
      createTemplate(templateId, values);
      onSuccess(templateId);
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

  let errors: Errors = {};
  const { value: unsavedValues, set: setUnsavedValues } = useDraftValue<
    Partial<Values>
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

  const values: Values = {
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
  errors: Errors;
  values: Values;
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
): Values => ({
  ...fieldDefaultValues,
  name: template.name,
  parentFolderId: pages?.rootFolderId ?? fieldDefaultValues.parentFolderId,
  path: nameToPath(pages, template.name),
  title: template.title,
  description: template.meta.description ?? fieldDefaultValues.description,
  excludePageFromSearch:
    template.meta.excludePageFromSearch ??
    fieldDefaultValues.excludePageFromSearch,
  language: template.meta.language ?? fieldDefaultValues.language,
  socialImageUrl:
    template.meta.socialImageUrl ?? fieldDefaultValues.socialImageUrl,
  socialImageAssetId:
    template.meta.socialImageAssetId ?? fieldDefaultValues.socialImageAssetId,
  customMetas: template.meta.custom ?? fieldDefaultValues.customMetas,
});

const getEditorCreatePageValues = (
  initialValues: Values,
  values: Values
): Partial<Values> => {
  const allowedValues: Partial<Values> = {
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

  const [initialValues] = useState<Values>(() =>
    template
      ? toFormValuesFromTemplate(template, pages)
      : {
          ...fieldDefaultValues,
          path: nameToPath(pages, fieldDefaultValues.name),
        }
  );
  const [values, setValues] = useState<Values>(initialValues);

  const errors = validateValues(pages, undefined, values, variableValues);
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
