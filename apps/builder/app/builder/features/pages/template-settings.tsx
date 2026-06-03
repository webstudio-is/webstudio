import { nanoid } from "nanoid";
import { z } from "zod";
import { useState, useCallback, useId, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
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
  theme,
  Button,
  Box,
  Label,
  InputErrorsTooltip,
  InputField,
  Grid,
  Separator,
  ScrollArea,
  DialogClose,
  DialogTitle,
  DialogTitleActions,
  TitleSuffixSpacer,
  TextArea,
  Checkbox,
  Text,
} from "@webstudio-is/design-system";
import { CopyIcon, TrashIcon } from "@webstudio-is/icons";
import {
  $isContentMode,
  $isDesignMode,
  $publishedOrigin,
} from "~/shared/nano-states";
import { $assets, $instances, $pages } from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { selectInstance } from "~/shared/nano-states";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { useUnmount } from "~/shared/hook-utils/use-mount";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { ImageControl } from "~/shared/project-settings";
import { computeExpression } from "~/shared/data-variables";
import { ImageInfo } from "./image-info";
import { SearchPreview } from "./search-preview";
import { SocialPreview } from "./social-preview";
import { CustomMetadata } from "./custom-metadata";
import {
  $pageRootScope,
  duplicateTemplate,
  instantiateTemplate,
  nameToPath,
} from "./page-utils";
import { Form } from "./form";
import {
  fieldDefaultValues,
  isEditorEditablePagePath,
  validateValues,
  updatePage,
  FormFields,
  type Values,
} from "./page-settings/page-settings";

type CustomMeta = { property: string; content: string };

const TemplateValues = z.object({
  name: PageName,
  title: PageTitle,
});

type TemplateFormValues = {
  name: string;
  title: string;
  description: string;
  excludePageFromSearch: string;
  language: string;
  socialImageUrl: string;
  socialImageAssetId: string;
  customMetas: CustomMeta[];
};

type TemplateErrors = {
  name?: string[];
  title?: string[];
};

const validateTemplateValues = (values: TemplateFormValues): TemplateErrors => {
  const result = TemplateValues.safeParse(values);
  if (result.success) {
    return {};
  }
  return result.error.formErrors.fieldErrors;
};

const templateFieldDefaultValues: TemplateFormValues = {
  name: "Untitled Template",
  title: `"Untitled"`,
  description: `""`,
  excludePageFromSearch: "false",
  language: `""`,
  socialImageUrl: `""`,
  socialImageAssetId: "",
  customMetas: [{ property: "", content: `""` }],
};

const createTemplate = (
  templateId: PageTemplate["id"],
  values: TemplateFormValues
) => {
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
  values: Partial<TemplateFormValues>
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
  const [values, setValues] = useState<TemplateFormValues>(
    templateFieldDefaultValues
  );
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
        onChange={(field, value) =>
          setValues((prev) => ({ ...prev, [field]: value }))
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
    <>
      <DialogTitle
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
        New template settings
      </DialogTitle>
      <Form onSubmit={onSubmit}>{children}</Form>
    </>
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

  const [unsavedValues, setUnsavedValues] = useState<
    Partial<TemplateFormValues>
  >({});

  const values: TemplateFormValues = {
    ...(template
      ? {
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

  const errors = validateTemplateValues(values);

  const debouncedFn = useEffectEvent(() => {
    if (
      Object.keys(unsavedValues).length === 0 ||
      Object.keys(errors).length !== 0
    ) {
      return;
    }
    updateTemplate(templateId, unsavedValues);
    setUnsavedValues({});
  });

  const handleSubmitDebounced = useDebouncedCallback(debouncedFn, 1000);

  const handleChange = useCallback(
    (
      field: keyof TemplateFormValues,
      value: TemplateFormValues[keyof TemplateFormValues]
    ) => {
      setUnsavedValues((prev) => ({ ...prev, [field]: value }));
      handleSubmitDebounced();
    },
    [handleSubmitDebounced]
  );

  useUnmount(() => {
    if (
      Object.keys(unsavedValues).length === 0 ||
      Object.keys(errors).length !== 0
    ) {
      return;
    }
    updateTemplate(templateId, unsavedValues);
  });

  if (template === undefined) {
    return null;
  }

  return (
    <TemplateSettingsView
      onClose={onClose}
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
  onDelete,
  onDuplicate,
  onClose,
  children,
}: {
  onDelete?: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  children: JSX.Element;
}) => {
  const isDesignMode = useStore($isDesignMode);
  return (
    <>
      <DialogTitle
        suffix={
          <DialogTitleActions>
            {isDesignMode && onDelete && (
              <Button
                color="ghost"
                prefix={<TrashIcon />}
                onClick={onDelete}
                aria-label="Delete template"
                tabIndex={2}
              />
            )}
            {isDesignMode && (
              <Button
                color="ghost"
                prefix={<CopyIcon />}
                onClick={onDuplicate}
                aria-label="Duplicate template"
                tabIndex={2}
              />
            )}
            <DialogClose />
          </DialogTitleActions>
        }
      >
        Template settings
      </DialogTitle>
      <Form onSubmit={onClose}>
        <fieldset style={{ display: "contents" }} disabled={!isDesignMode}>
          {children}
        </fieldset>
      </Form>
    </>
  );
};

const TemplateFormFields = ({
  autoSelect,
  errors,
  values,
  onChange,
}: {
  autoSelect?: boolean;
  errors: TemplateErrors;
  values: TemplateFormValues;
  onChange: (
    field: keyof TemplateFormValues,
    value: TemplateFormValues[keyof TemplateFormValues]
  ) => void;
}) => {
  const nameId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const excludePageFromSearchId = useId();
  const socialImageFieldId = useId();

  const { variableValues, scope, aliases } = useStore($pageRootScope);
  const assets = useStore($assets);
  const publishedOrigin = useStore($publishedOrigin);
  const pages = useStore($pages);
  const faviconAsset = assets.get(pages?.meta?.faviconAssetId ?? "");
  const faviconUrl = faviconAsset?.type === "image" ? faviconAsset.name : "";

  const title = String(computeExpression(values.title, variableValues));
  const description = String(
    computeExpression(values.description, variableValues)
  );
  const excludePageFromSearch = Boolean(
    computeExpression(values.excludePageFromSearch, variableValues)
  );
  const socialImageUrl = String(
    computeExpression(values.socialImageUrl, variableValues)
  );
  const socialImageAsset = assets.get(values.socialImageAssetId);

  return (
    <Grid css={{ height: "100%" }}>
      <ScrollArea>
        <Grid gap={2} css={{ padding: theme.panel.padding }}>
          {/* Template name */}
          <Grid gap={1}>
            <Label htmlFor={nameId}>Template name</Label>
            <InputErrorsTooltip errors={errors.name}>
              <InputField
                color={errors.name && "error"}
                id={nameId}
                autoFocus={autoSelect}
                placeholder="About"
                value={values.name}
                onChange={(event) => onChange("name", event.target.value)}
              />
            </InputErrorsTooltip>
          </Grid>
        </Grid>

        <Separator />

        {/* Search settings */}
        <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
          <Label text="title">Search</Label>
          <Text color="subtle">
            Optimize the way pages created from this template appear in search
            engine results.
          </Text>

          {/* Page title */}
          <Grid gap={1}>
            <Label>Search result preview</Label>
            <Box
              css={{
                padding: theme.spacing[5],
                background: theme.colors.white,
                borderRadius: theme.borderRadius[4],
                border: `1px solid ${theme.colors.borderMain}`,
              }}
            >
              <Box
                css={{
                  transformOrigin: "top left",
                  transform: "scale(0.667)",
                  width: 600,
                  height: 80,
                }}
              >
                <SearchPreview
                  siteName={pages?.meta?.siteName ?? ""}
                  faviconUrl={faviconUrl}
                  pageUrl={publishedOrigin}
                  titleLink={title}
                  snippet={description}
                />
              </Box>
            </Box>
          </Grid>

          <Grid gap={1}>
            <Label htmlFor={titleId}>Title</Label>
            <BindingControl>
              <BindingPopover
                scope={scope}
                aliases={aliases}
                variant={
                  isLiteralExpression(values.title) ? "default" : "bound"
                }
                value={values.title}
                onChange={(value) => onChange("title", value)}
                onRemove={(evaluatedValue) =>
                  onChange("title", JSON.stringify(evaluatedValue ?? ""))
                }
              />
              <InputErrorsTooltip errors={errors.title}>
                <InputField
                  color={errors.title && "error"}
                  id={titleId}
                  placeholder="My Page"
                  disabled={isLiteralExpression(values.title) === false}
                  value={title}
                  onChange={(event) =>
                    onChange("title", JSON.stringify(event.target.value))
                  }
                />
              </InputErrorsTooltip>
            </BindingControl>
          </Grid>

          {/* Description */}
          <Grid gap={1}>
            <Label htmlFor={descriptionId}>Description</Label>
            <BindingControl>
              <BindingPopover
                scope={scope}
                aliases={aliases}
                variant={
                  isLiteralExpression(values.description) ? "default" : "bound"
                }
                value={values.description}
                onChange={(value) => onChange("description", value)}
                onRemove={(evaluatedValue) =>
                  onChange("description", JSON.stringify(evaluatedValue ?? ""))
                }
              />
              <InputErrorsTooltip errors={undefined}>
                <TextArea
                  id={descriptionId}
                  disabled={isLiteralExpression(values.description) === false}
                  value={description}
                  onChange={(value) =>
                    onChange("description", JSON.stringify(value))
                  }
                  autoGrow
                  maxRows={10}
                />
              </InputErrorsTooltip>
            </BindingControl>

            {/* Exclude from search */}
            <BindingControl>
              <Grid
                flow={"column"}
                gap={1}
                justify={"start"}
                align={"center"}
                css={{ py: theme.spacing[2] }}
              >
                <BindingPopover
                  scope={scope}
                  aliases={aliases}
                  variant={
                    isLiteralExpression(values.excludePageFromSearch)
                      ? "default"
                      : "bound"
                  }
                  value={values.excludePageFromSearch}
                  onChange={(value) => onChange("excludePageFromSearch", value)}
                  onRemove={(evaluatedValue) =>
                    onChange(
                      "excludePageFromSearch",
                      JSON.stringify(evaluatedValue ?? "")
                    )
                  }
                />
                <Checkbox
                  id={excludePageFromSearchId}
                  disabled={
                    isLiteralExpression(values.excludePageFromSearch) === false
                  }
                  checked={excludePageFromSearch}
                  onCheckedChange={() => {
                    onChange(
                      "excludePageFromSearch",
                      (!excludePageFromSearch).toString()
                    );
                  }}
                />
                <Label htmlFor={excludePageFromSearchId}>
                  Exclude this page from search results
                </Label>
              </Grid>
            </BindingControl>
          </Grid>
        </Grid>

        <Separator />

        {/* Social image */}
        <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
          <Label htmlFor={socialImageFieldId} text="title">
            Social image
          </Label>
          <Text color="subtle">
            This image appears when pages from this template are shared on
            social media. The optimal dimensions are 1200x630 px or larger with
            a 1.91:1 aspect ratio.
          </Text>
          <BindingControl>
            <BindingPopover
              scope={scope}
              aliases={aliases}
              variant={
                isLiteralExpression(values.socialImageUrl) ? "default" : "bound"
              }
              value={values.socialImageUrl}
              onChange={(value) => onChange("socialImageUrl", value)}
              onRemove={(evaluatedValue) =>
                onChange("socialImageUrl", JSON.stringify(evaluatedValue ?? ""))
              }
            />
            <InputErrorsTooltip errors={undefined}>
              <InputField
                placeholder="https://www.url.com"
                disabled={isLiteralExpression(values.socialImageUrl) === false}
                value={socialImageUrl}
                onChange={(event) => {
                  onChange(
                    "socialImageUrl",
                    JSON.stringify(event.target.value)
                  );
                  onChange("socialImageAssetId", "");
                }}
              />
            </InputErrorsTooltip>
          </BindingControl>
          <Grid gap={1} flow={"column"}>
            <ImageControl
              onAssetIdChange={(assetId) => {
                onChange("socialImageAssetId", assetId);
                onChange("socialImageUrl", `""`);
              }}
            >
              <Button
                id={socialImageFieldId}
                css={{ justifySelf: "start" }}
                color="neutral"
              >
                Choose image from assets
              </Button>
            </ImageControl>
          </Grid>
          {socialImageAsset?.type === "image" && (
            <ImageInfo
              asset={socialImageAsset}
              onDelete={() => onChange("socialImageAssetId", "")}
            />
          )}
          <div />
          <SocialPreview
            ogImageUrl={
              socialImageAsset?.type === "image"
                ? socialImageAsset.name
                : socialImageUrl
            }
            ogUrl={publishedOrigin}
            ogTitle={title}
            ogDescription={description}
          />
        </Grid>

        <Separator />

        {/* Custom metadata */}
        <CustomMetadata
          customMetas={values.customMetas}
          onChange={(customMetas) => onChange("customMetas", customMetas)}
        />

        <Separator />
      </ScrollArea>
    </Grid>
  );
};

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

  if (isEditorEditablePagePath(initialValues.path)) {
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

  return allowedValues;
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

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const newPageId = instantiateTemplate({
        templateId,
        overrides: { name: values.name, path: values.path },
        folderId: values.parentFolderId,
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
    <>
      <DialogTitle
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
        Create page from template
      </DialogTitle>
      <Form onSubmit={handleSubmit}>
        <FormFields
          autoSelect
          errors={errors}
          values={values}
          isEditorContext={isContentMode}
          canEditName
          canEditPath={
            isContentMode === false ||
            isEditorEditablePagePath(initialValues.path)
          }
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
      </Form>
    </>
  );
};
