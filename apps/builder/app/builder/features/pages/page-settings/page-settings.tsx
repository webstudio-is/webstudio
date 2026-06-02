import { nanoid } from "nanoid";
import { useState, useCallback, useEffect, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
import slugify from "slugify";
import {
  ROOT_FOLDER_ID,
  documentTypes,
  type Page,
  type Pages,
  findPageByIdOrPath,
  findParentFolderByChildId,
  getPagePath,
  getHomePage,
  elementComponent,
} from "@webstudio-is/sdk";
import { validateBasicAuth } from "@webstudio-is/wsauth";
import {
  theme,
  Button,
  Box,
  Tooltip,
  Grid,
  Text,
  ScrollArea,
  Link,
  PanelBanner,
  TitleSuffixSpacer,
  DialogClose,
  DialogTitle,
  DialogTitleActions,
} from "@webstudio-is/design-system";
import { CopyIcon, TrashIcon } from "@webstudio-is/icons";
import { $isDesignMode, $permissions } from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { useUnmount } from "~/shared/hook-utils/use-mount";
import { selectInstance } from "~/shared/nano-states";
import {
  registerFolderChildMutable,
  cleanupChildRefsMutable,
  $pageRootScope,
  duplicatePage,
} from "../page-utils";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { Form } from "../form";
import { findMatchingRedirect } from "~/shared/project-settings/utils";
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

const fieldDefaultValues: Values = {
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

const validateValues = (
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

export const __testing__ = {
  computePagePath,
  fieldDefaultValues,
  getAuthFromValues,
  toFormValues,
  validateValues,
};

const FormFields = ({
  autoSelect,
  errors,
  values,
  onChange,
  showAuthErrors,
}: {
  autoSelect?: boolean;
  errors: Errors;
  values: Values;
  onChange: OnChange;
  showAuthErrors?: boolean;
}) => {
  const project = useStore($project);
  const pages = useStore($pages);
  const { allowAuth } = useStore($permissions);

  if (pages === undefined) {
    return;
  }

  const fullPagePath = computePagePath(values, pages);
  const matchingRedirect = findMatchingRedirect(
    fullPagePath,
    pages.redirects ?? []
  );

  return (
    <Grid css={{ height: "100%" }}>
      <ScrollArea>
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
            onChange={onChange}
          />
        </CollapsibleSection>

        <CollapsibleSection label="Authentication">
          <AuthSection
            values={values}
            errors={errors}
            onChange={onChange}
            showUpgrade={allowAuth === false}
            showErrors={showAuthErrors}
          />
        </CollapsibleSection>

        {values.documentType === "text" && (
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
              onChange={onChange}
            />
          </CollapsibleSection>
        )}

        {values.documentType === "html" && (
          <CollapsibleSection label="Social Image">
            <SocialImageSection
              values={values}
              errors={errors}
              onChange={onChange}
            />
          </CollapsibleSection>
        )}

        {values.documentType === "html" && (
          <CollapsibleSection label="Custom Metadata">
            <CustomMetadataSection
              values={values}
              errors={errors}
              onChange={onChange}
            />
          </CollapsibleSection>
        )}

        {values.documentType === "html" &&
          (project?.marketplaceApprovalStatus === "PENDING" ||
            project?.marketplaceApprovalStatus === "APPROVED" ||
            project?.marketplaceApprovalStatus === "REJECTED") && (
            <CollapsibleSection label="Marketplace">
              <MarketplaceSection values={values} onChange={onChange} />
            </CollapsibleSection>
          )}

        <Box css={{ height: theme.spacing[10] }} />
      </ScrollArea>
    </Grid>
  );
};

const nameToPath = (pages: Pages | undefined, name: string) => {
  if (name === "") {
    return "";
  }

  const slug = slugify(name, { lower: true, strict: true });
  const path = `/${slug}`;

  // for TypeScript
  if (pages === undefined) {
    return path;
  }

  if (findPageByIdOrPath(path, pages) === undefined) {
    return path;
  }

  let suffix = 1;

  while (findPageByIdOrPath(`${path}${suffix}`, pages) !== undefined) {
    suffix++;
  }

  return `${path}${suffix}`;
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
              {isSubmitting ? "Creating" : "Create page"}
            </Button>
            <DialogClose />
          </DialogTitleActions>
        }
      >
        New Page Settings
      </DialogTitle>
      <Form onSubmit={onSubmit}>{children}</Form>
    </>
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
      pages.pages.set(pageId, {
        id: pageId,
        name: values.name,
        path: values.path,
        title: values.title,
        rootInstanceId,
        meta: {
          auth: getAuthFromValues(values),
        },
      });
      instances.set(rootInstanceId, {
        type: "instance",
        id: rootInstanceId,
        component: elementComponent,
        tag: "body",
        children: [],
      });
      registerFolderChildMutable(pages, pageId, values.parentFolderId);
      selectInstance(undefined);
    }
  );
};

const updatePage = (pageId: Page["id"], values: Partial<Values>) => {
  const updatePageMutable = (
    page: Page,
    values: Partial<Values>,
    pages: Pages
  ) => {
    if (values.name !== undefined) {
      page.name = values.name;
    }
    if (values.path !== undefined) {
      page.path = page.id === pages.homePageId ? "" : values.path;
    }
    if (values.title !== undefined) {
      page.title = values.title;
    }

    if (values.description !== undefined) {
      page.meta.description = values.description;
    }

    if (values.excludePageFromSearch !== undefined) {
      page.meta.excludePageFromSearch = values.excludePageFromSearch;
    }

    if (values.language !== undefined) {
      page.meta.language =
        values.language.length > 0 ? values.language : undefined;
    }

    if ("status" in values) {
      page.meta.status = values.status;
    }

    if (values.redirect !== undefined) {
      page.meta.redirect =
        values.redirect.length > 0 ? values.redirect : undefined;
    }

    if (values.socialImageAssetId !== undefined) {
      page.meta.socialImageAssetId =
        values.socialImageAssetId.length > 0
          ? values.socialImageAssetId
          : undefined;
    }
    if (values.socialImageUrl !== undefined) {
      page.meta.socialImageUrl =
        values.socialImageUrl.length > 0 ? values.socialImageUrl : undefined;
    }

    if (values.customMetas !== undefined) {
      page.meta.custom = values.customMetas;
    }

    if (values.documentType !== undefined) {
      page.meta.documentType = values.documentType;
    }

    if (values.content !== undefined) {
      page.meta.content = values.content;
    }

    if (values.auth !== undefined) {
      page.meta.auth = getAuthFromValues({
        ...toFormValues(page, pages, page.id === pages.homePageId),
        ...values,
      });
    }

    if (values.parentFolderId !== undefined) {
      registerFolderChildMutable(pages, page.id, values.parentFolderId);
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

  const isHomePage = page?.id === pages?.homePageId;

  const [unsavedValues, setUnsavedValues] = useState<Partial<Values>>({});

  const values: Values = {
    ...(page ? toFormValues(page, pages, isHomePage) : fieldDefaultValues),
    ...unsavedValues,
  };

  const { variableValues } = useStore($pageRootScope);
  const errors = validateValues(pages, pageId, values, variableValues);

  const debouncedFn = useEffectEvent(() => {
    if (
      Object.keys(unsavedValues).length === 0 ||
      Object.keys(errors).length !== 0
    ) {
      return;
    }

    updatePage(pageId, unsavedValues);

    setUnsavedValues({});
  });

  const handleSubmitDebounced = useDebouncedCallback(debouncedFn, 1000);

  const [refreshDebounce, setRefreshDebounce] = useState(0);

  useEffect(() => {
    // we can't flush immediately as setState haven't propagated at that time
    handleSubmitDebounced.flush();
  }, [refreshDebounce, handleSubmitDebounced]);

  const handleChange = useCallback(
    <Name extends FieldName>(event: { field: Name; value: Values[Name] }) => {
      setUnsavedValues((values) => ({
        ...values,
        [event.field]: event.value,
      }));
      handleSubmitDebounced();

      if (event.field === "isHomePage") {
        setRefreshDebounce((prev) => prev + 1);
      }
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
    updatePage(pageId, unsavedValues);
  });

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
        <FormFields errors={errors} values={values} onChange={handleChange} />
      </PageSettingsView>
    </>
  );
};

const PageSettingsView = ({
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
    <div
      data-floating-panel-container
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <DialogTitle
        suffix={
          <DialogTitleActions>
            {isDesignMode && onDelete && (
              <Tooltip content="Delete page" side="bottom">
                <Button
                  color="ghost"
                  prefix={<TrashIcon />}
                  onClick={onDelete}
                  aria-label="Delete page"
                  tabIndex={2}
                />
              </Tooltip>
            )}
            {isDesignMode && (
              <Tooltip content="Duplicate page" side="bottom">
                <Button
                  color="ghost"
                  prefix={<CopyIcon />}
                  onClick={onDuplicate}
                  aria-label="Duplicate page"
                  tabIndex={2}
                />
              </Tooltip>
            )}
            <DialogClose />
          </DialogTitleActions>
        }
      >
        Page Settings
      </DialogTitle>
      <Form onSubmit={onClose}>
        <fieldset style={{ display: "contents" }} disabled={!isDesignMode}>
          {children}
        </fieldset>
      </Form>
    </div>
  );
};
