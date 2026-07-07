import { nanoid } from "nanoid";
import { useState, useEffect, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
  ROOT_FOLDER_ID,
  documentTypes,
  type Page,
  type Pages,
  findPageByIdOrPath,
  findParentFolderByChildId,
  getPagePath,
  getHomePage,
  isLiteralExpression,
} from "@webstudio-is/sdk";
import { validateBasicAuth } from "@webstudio-is/wsauth";
import {
  theme,
  Button,
  Box,
  Grid,
  Text,
  ScrollAreaNative,
  Link,
  PanelBanner,
  TitleSuffixSpacer,
  DialogClose,
  DialogTitle,
  DialogTitleActions,
} from "@webstudio-is/design-system";
import {
  $authPermit,
  $isContentMode,
  $isDesignMode,
  $permissions,
} from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { selectInstance } from "~/shared/nano-states";
import { $pageRootScope, duplicatePage, nameToPath } from "../page-utils";
import {
  cleanupChildRefsMutable,
  registerFolderChildMutable,
} from "~/shared/page-utils/tree";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { Form } from "../form";
import { findMatchingRedirect } from "~/shared/project-settings/utils";
import { isContentModePagePath } from "@webstudio-is/project/content-mode-permissions";
import {
  createPageRootInstance,
  createPageValue,
} from "@webstudio-is/project-build/runtime/pages";
import { updatePageFieldsMutable } from "~/shared/page-utils/meta";
import { AuthSection, validateAuthSection } from "./section-auth";
import {
  CustomMetadataSection,
  validateCustomMetadataSection,
} from "./section-custom-metadata";
import { GeneralSection, validateGeneralSection } from "./section-general";
import { MarketplaceSection } from "./section-marketplace";
import { SearchSection, validateSearchSection } from "./section-search";
import {
  SocialImageSection,
  validateSocialImageSection,
} from "./section-social-image";
import {
  TextContentSection,
  validateTextContentSection,
} from "./section-text-content";
import {
  type Errors,
  type FieldName,
  type OnChange,
  type Values,
} from "./shared";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { copyPage } from "~/shared/copy-paste/copy-paste";
import { PageItemActionsDropdown } from "../page-item-actions";

export type { Values } from "./shared";

export const fieldDefaultValues: Values = {
  name: "Untitled",
  parentFolderId: ROOT_FOLDER_ID,
  path: "/untitled",
  isHomePage: false,
  title: `"Untitled"`,
  description: `""`,
  excludePageFromSearch: `true`,
  language: `""`,
  socialImageUrl: `""`,
  socialImageAssetId: "",
  status: undefined,
  redirect: `""`,
  documentType: "html" as (typeof documentTypes)[number],
  content: `""`,
  auth: {
    login: "",
    password: "",
  },
  customMetas: [{ property: "", content: `""` }],
  marketplace: {
    include: false,
    category: "",
    thumbnailAssetId: "",
  },
};

const emptyUnsavedValues: Partial<Values> = {};

const computePagePath = (values: Values, pages: Pages): string => {
  if (values.isHomePage) {
    return "/";
  }
  const foldersPath = getPagePath(values.parentFolderId, pages);
  return [foldersPath, values.path]
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
};

const nonAuthFieldNames = Object.keys(fieldDefaultValues).filter(
  (fieldName): fieldName is Exclude<FieldName, "auth"> => fieldName !== "auth"
);

export const validateValues = (
  pages: undefined | Pages,
  // undefined page id means new page
  pageId: undefined | Page["id"],
  values: Values,
  variableValues: Map<string, unknown>
): Errors => {
  const errors: Errors = {};
  const sectionErrors = [
    validateGeneralSection({ pages, pageId, values, variableValues }),
    validateAuthSection(values),
  ];
  if (values.documentType === "html") {
    sectionErrors.push(
      validateSearchSection(values, variableValues),
      validateSocialImageSection(values, variableValues),
      validateCustomMetadataSection(values, variableValues)
    );
  }
  if (values.documentType === "text") {
    sectionErrors.push(validateTextContentSection(values, variableValues));
  }
  for (const sectionError of sectionErrors) {
    if (sectionError.auth) {
      errors.auth = { ...errors.auth, ...sectionError.auth };
    }
    for (const fieldName of nonAuthFieldNames) {
      const messages = sectionError[fieldName];
      if (messages === undefined) {
        continue;
      }
      errors[fieldName] = [...(errors[fieldName] ?? []), ...messages];
    }
  }
  return errors;
};

const toFormValues = (
  page: Page,
  pages: Pages,
  isHomePage: boolean
): Values => {
  const parentFolder = findParentFolderByChildId(page.id, pages.folders);
  return {
    name: page.name,
    parentFolderId: parentFolder?.id ?? pages.rootFolderId,
    path: page.path,
    title: page.title,
    description: page.meta.description ?? fieldDefaultValues.description,
    socialImageUrl:
      page.meta.socialImageUrl ?? fieldDefaultValues.socialImageUrl,
    socialImageAssetId:
      page.meta.socialImageAssetId ?? fieldDefaultValues.socialImageAssetId,
    excludePageFromSearch:
      page.meta.excludePageFromSearch ??
      fieldDefaultValues.excludePageFromSearch,
    language: page.meta.language ?? fieldDefaultValues.language,
    status: page.meta.status ?? fieldDefaultValues.status,
    redirect: page.meta.redirect ?? fieldDefaultValues.redirect,
    documentType: page.meta.documentType ?? fieldDefaultValues.documentType,
    content: page.meta.content ?? fieldDefaultValues.content,
    auth: {
      login: page.meta.auth?.login ?? fieldDefaultValues.auth.login,
      password: page.meta.auth?.password ?? fieldDefaultValues.auth.password,
    },
    isHomePage,
    customMetas: page.meta.custom ?? fieldDefaultValues.customMetas,
    marketplace: {
      include:
        page.marketplace?.include ?? fieldDefaultValues.marketplace.include,
      category:
        page.marketplace?.category ?? fieldDefaultValues.marketplace.category,
      thumbnailAssetId:
        page.marketplace?.thumbnailAssetId ??
        fieldDefaultValues.marketplace.thumbnailAssetId,
    },
  };
};

const getAuthFromValues = (values: Values): Page["meta"]["auth"] => {
  if (values.auth.login === "" && values.auth.password === "") {
    return;
  }
  const auth = validateBasicAuth({
    login: values.auth.login,
    password: values.auth.password,
  }).auth;
  if (auth === undefined) {
    return;
  }
  return {
    method: auth.method,
    login: auth.login,
    password: auth.password,
  };
};

const getInitialPageMeta = (values: Values): Page["meta"] => {
  const meta: Page["meta"] = {};
  const auth = getAuthFromValues(values);
  if (auth !== undefined) {
    meta.auth = auth;
  }
  return meta;
};

export const canEditPagePathInMode = ({
  isDesignMode,
  isContentMode,
  path,
}: {
  isDesignMode: boolean;
  isContentMode: boolean;
  path: string;
}) => {
  return isDesignMode || (isContentMode && isContentModePagePath(path));
};

export const addContentModePathError = ({
  errors,
  isContentMode,
  path,
}: {
  errors: Errors;
  isContentMode: boolean;
  path: string;
}) => {
  if (isContentMode && isContentModePagePath(path) === false) {
    errors.path = errors.path ?? [];
    errors.path.push("Editors can only set static page paths");
  }
};

export const __testing__ = {
  addContentModePathError,
  computePagePath,
  canEditPagePathInMode,
  fieldDefaultValues,
  getAuthFromValues,
  getInitialPageMeta,
  toFormValues,
  validateValues,
};

export const FormFields = ({
  autoSelect,
  errors,
  values,
  onChange,
  showAuthErrors,
  isEditorContext = false,
  nameLabel = "Page name",
  canEditName = true,
  canEditPath = true,
  showHomePageControl = true,
  showPathField = true,
  showStatusField = isEditorContext === false,
  showRedirectField = isEditorContext === false,
  showDocumentTypeField = isEditorContext === false,
  showRedirectWarning = showPathField,
  showAuthSection = isEditorContext === false,
  showTextContentSection = isEditorContext === false,
  showMarketplaceSection = isEditorContext === false,
}: {
  autoSelect?: boolean;
  errors: Errors;
  values: Values;
  onChange: OnChange;
  showAuthErrors?: boolean;
  isEditorContext?: boolean;
  nameLabel?: string;
  canEditName?: boolean;
  canEditPath?: boolean;
  showHomePageControl?: boolean;
  showPathField?: boolean;
  showStatusField?: boolean;
  showRedirectField?: boolean;
  showDocumentTypeField?: boolean;
  showRedirectWarning?: boolean;
  showAuthSection?: boolean;
  showTextContentSection?: boolean;
  showMarketplaceSection?: boolean;
}) => {
  const project = useStore($project);
  const pages = useStore($pages);
  const { allowAuth } = useStore($permissions);
  const isDesignMode = useStore($isDesignMode);

  if (pages === undefined) {
    return;
  }

  const matchingRedirect = showRedirectWarning
    ? findMatchingRedirect(
        computePagePath(values, pages),
        pages.redirects ?? []
      )
    : undefined;
  const showBindingControls = isDesignMode && isEditorContext === false;

  return (
    <Grid css={{ height: "100%" }}>
      <ScrollAreaNative>
        {matchingRedirect && (
          <PanelBanner variant="warning">
            <Text>
              A redirect from "{matchingRedirect.old}" will override this page.
              The page will not be rendered when published.{" "}
              <Link
                color="inherit"
                underline="always"
                onClick={() => {
                  $openProjectSettings.set("redirects");
                }}
              >
                Go to Redirects settings
              </Link>
            </Text>
          </PanelBanner>
        )}
        <CollapsibleSection label="General">
          <GeneralSection
            autoSelect={autoSelect}
            errors={errors}
            values={values}
            pages={pages}
            isEditorContext={isEditorContext}
            nameLabel={nameLabel}
            canEditName={canEditName}
            canEditPath={canEditPath}
            showHomePageControl={showHomePageControl}
            showPathField={showPathField}
            showStatusField={showStatusField}
            showRedirectField={showRedirectField}
            showDocumentTypeField={showDocumentTypeField}
            showBindingControls={showBindingControls}
            onChange={onChange}
          />
        </CollapsibleSection>

        {showAuthSection && (
          <CollapsibleSection label="Authentication">
            <AuthSection
              values={values}
              errors={errors}
              onChange={onChange}
              showUpgrade={allowAuth === false}
              showErrors={showAuthErrors}
            />
          </CollapsibleSection>
        )}

        {showTextContentSection && values.documentType === "text" && (
          <CollapsibleSection label="Content">
            <TextContentSection
              values={values}
              errors={errors}
              onChange={onChange}
            />
          </CollapsibleSection>
        )}

        {values.documentType === "html" && (
          <CollapsibleSection label="Search">
            <SearchSection
              values={values}
              errors={errors}
              canEditTitle={
                isEditorContext === false || isLiteralExpression(values.title)
              }
              canEditDescription={
                isEditorContext === false ||
                isLiteralExpression(values.description)
              }
              canEditExcludePageFromSearch={
                isEditorContext === false ||
                isLiteralExpression(values.excludePageFromSearch)
              }
              canEditLanguage={
                isEditorContext === false ||
                isLiteralExpression(values.language)
              }
              showBindingControls={showBindingControls}
              onChange={onChange}
            />
          </CollapsibleSection>
        )}

        {values.documentType === "html" && (
          <CollapsibleSection label="Social image">
            <SocialImageSection
              values={values}
              errors={errors}
              disabled={
                isEditorContext &&
                isLiteralExpression(values.socialImageUrl) === false
              }
              showBindingControls={showBindingControls}
              onChange={onChange}
            />
          </CollapsibleSection>
        )}

        {values.documentType === "html" && (
          <CollapsibleSection label="Custom metadata">
            <CustomMetadataSection
              values={values}
              errors={errors}
              showBindingControls={showBindingControls}
              onChange={onChange}
            />
          </CollapsibleSection>
        )}

        {values.documentType === "html" &&
          showMarketplaceSection &&
          (project?.marketplaceApprovalStatus === "PENDING" ||
            project?.marketplaceApprovalStatus === "APPROVED" ||
            project?.marketplaceApprovalStatus === "REJECTED") && (
            <CollapsibleSection label="Marketplace">
              <MarketplaceSection values={values} onChange={onChange} />
            </CollapsibleSection>
          )}

        <Box css={{ height: theme.spacing[10] }} />
      </ScrollAreaNative>
    </Grid>
  );
};

export const NewPageSettings = ({
  onSuccess,
}: {
  onSuccess: (pageId: Page["id"]) => void;
}) => {
  const pages = useStore($pages);

  const [values, setValues] = useState<Values>({
    ...fieldDefaultValues,
    parentFolderId: pages?.rootFolderId ?? fieldDefaultValues.parentFolderId,
    path: nameToPath(pages, fieldDefaultValues.name),
  });
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const { variableValues } = useStore($pageRootScope);
  const errors = validateValues(pages, undefined, values, variableValues);

  const handleSubmit = () => {
    setIsSubmitAttempted(true);
    if (Object.keys(errors).length === 0) {
      const pageId = nanoid();
      createPage(pageId, values);
      updatePage(pageId, values);
      onSuccess(pageId);
    }
  };

  return (
    <NewPageSettingsView onSubmit={handleSubmit} isSubmitting={false}>
      <FormFields
        autoSelect
        errors={errors}
        values={values}
        showAuthErrors={isSubmitAttempted}
        onChange={(val) => {
          setValues((values) => {
            const changes = { [val.field]: val.value };

            if (val.field === "name") {
              if (values.path === nameToPath(pages, values.name)) {
                changes.path = nameToPath(pages, val.value);
              }
              if (values.title === values.name) {
                changes.title = val.value;
              }
            }
            return { ...values, ...changes };
          });
        }}
      />
    </NewPageSettingsView>
  );
};

const NewPageSettingsView = ({
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
      title="New page settings"
      onSubmit={onSubmit}
      suffix={
        <DialogTitleActions>
          <TitleSuffixSpacer />
          <Button
            state={isSubmitting ? "pending" : "auto"}
            onClick={onSubmit}
            tabIndex={2}
          >
            {isSubmitting ? "Creating" : "Create page"}
          </Button>
          <DialogClose />
        </DialogTitleActions>
      }
    >
      {children}
    </PageSettingsPanel>
  );
};

const createPage = (pageId: Page["id"], values: Values) => {
  serverSyncStore.createTransaction(
    [$pages, $instances],
    (pages, instances) => {
      if (pages === undefined) {
        return;
      }
      const rootInstanceId = nanoid();
      pages.pages.set(
        pageId,
        createPageValue({
          pageId,
          name: values.name,
          path: values.path,
          title: values.title,
          rootInstanceId,
          meta: getInitialPageMeta(values),
        })
      );
      instances.set(rootInstanceId, createPageRootInstance(rootInstanceId));
      registerFolderChildMutable(pages, pageId, values.parentFolderId);
      selectInstance(undefined);
    }
  );
};

export const updatePage = (pageId: Page["id"], values: Partial<Values>) => {
  const updatePageMutable = (
    page: Page,
    values: Partial<Values>,
    pages: Pages
  ) => {
    updatePageFieldsMutable({ page, pages, values });

    if (values.auth !== undefined) {
      page.meta.auth = getAuthFromValues({
        ...toFormValues(page, pages, page.id === pages.homePageId),
        ...values,
      });
    }

    if (values.marketplace !== undefined) {
      page.marketplace ??= {};
      page.marketplace.include = values.marketplace.include;
      page.marketplace.category =
        values.marketplace.category.length > 0
          ? values.marketplace.category
          : undefined;
      page.marketplace.thumbnailAssetId =
        values.marketplace.thumbnailAssetId.length > 0
          ? values.marketplace.thumbnailAssetId
          : undefined;
    }
  };

  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }

    const pageToUpdate = pages.pages.get(pageId);

    if (pageToUpdate !== undefined) {
      updatePageMutable(pageToUpdate, values, pages);
    }

    // swap home page
    if (values.isHomePage && pages.homePageId !== pageId) {
      const newHomePage = pages.pages.get(pageId);
      const oldHomePage = getHomePage(pages);
      if (newHomePage === undefined) {
        throw new Error(`Page with id ${pageId} not found`);
      }

      pages.homePageId = newHomePage.id;
      newHomePage.path = "";
      newHomePage.name = "Home";

      // For simplicity skip logic in case of names are same i.e. Old Home 1, Old Home 2
      oldHomePage.name = "Old Home";
      oldHomePage.path = nameToPath(pages, oldHomePage.name);

      const rootFolder = pages.folders.get(pages.rootFolderId);

      if (rootFolder === undefined) {
        throw new Error("Root folder not found");
      }

      cleanupChildRefsMutable(newHomePage.id, pages.folders);
      rootFolder.children.unshift(newHomePage.id);
    }
  });
};

export const PageSettings = ({
  onClose,
  onDuplicate,
  onDelete,
  pageId,
}: {
  onClose: () => void;
  onDuplicate: (newPageId: string) => void;
  onDelete?: () => void;
  pageId: string;
}) => {
  const pages = useStore($pages);
  const page = pages && findPageByIdOrPath(pageId, pages);
  const isDesignMode = useStore($isDesignMode);
  const isContentMode = useStore($isContentMode);

  const isHomePage = page?.id === pages?.homePageId;

  const [refreshDebounce, setRefreshDebounce] = useState(0);
  let errors: Errors = {};
  const {
    value: unsavedValues,
    set: setUnsavedValues,
    flush: flushSave,
  } = useDraftValue<Partial<Values>>(
    emptyUnsavedValues,
    (values) => {
      updatePage(pageId, values);
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
    if (event.field === "isHomePage") {
      setRefreshDebounce((prev) => prev + 1);
    }
  };

  const values: Values = {
    ...(page ? toFormValues(page, pages, isHomePage) : fieldDefaultValues),
    ...unsavedValues,
  };

  const { variableValues } = useStore($pageRootScope);
  errors = validateValues(pages, pageId, values, variableValues);
  if (unsavedValues.path !== undefined) {
    addContentModePathError({
      errors,
      isContentMode,
      path: unsavedValues.path,
    });
  }

  useEffect(() => {
    // we can't flush immediately as setState haven't propagated at that time
    flushSave();
  }, [refreshDebounce, flushSave]);

  const handleRequestDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  if (page === undefined) {
    return null;
  }

  return (
    <>
      <PageSettingsView
        onClose={onClose}
        onCopy={() => {
          void copyPage(pageId);
        }}
        onDelete={values.isHomePage === false ? handleRequestDelete : undefined}
        onDuplicate={() => {
          const newPageId = duplicatePage(pageId);
          if (newPageId !== undefined) {
            // In `canvas.tsx`, within `subscribeStyles`, we use `requestAnimationFrame` (RAF) for style recalculation.
            // After `duplicatePage`, styles are not yet recalculated.
            // To ensure they are properly updated, we use double RAF.
            requestAnimationFrame(() => {
              // At this tick styles are updating
              requestAnimationFrame(() => {
                // At this tick styles are updated
                onDuplicate(newPageId);
              });
            });
          }
        }}
      >
        <FormFields
          errors={errors}
          values={values}
          isEditorContext={isDesignMode === false}
          canEditName={isDesignMode || isContentMode}
          canEditPath={canEditPagePathInMode({
            isDesignMode,
            isContentMode,
            path: page.path,
          })}
          onChange={handleChange}
        />
      </PageSettingsView>
    </>
  );
};

export const PageSettingsPanel = ({
  title,
  suffix,
  disabled = false,
  onSubmit,
  children,
}: {
  title: string;
  suffix: JSX.Element;
  disabled?: boolean;
  onSubmit: () => void;
  children: JSX.Element;
}) => {
  return (
    <div
      data-floating-panel-container
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <DialogTitle suffix={suffix}>{title}</DialogTitle>
      <Form onSubmit={onSubmit}>
        <fieldset style={{ display: "contents" }} disabled={disabled}>
          {children}
        </fieldset>
      </Form>
    </div>
  );
};

const PageSettingsView = ({
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
  const isContentMode = useStore($isContentMode);
  const authPermit = useStore($authPermit);
  const canEditPageSettings =
    isDesignMode || (isContentMode && authPermit !== "view");
  return (
    <PageSettingsPanel
      title="Page settings"
      onSubmit={onClose}
      disabled={canEditPageSettings === false}
      suffix={
        <DialogTitleActions>
          {isDesignMode && (
            <PageItemActionsDropdown
              label="Page actions"
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
