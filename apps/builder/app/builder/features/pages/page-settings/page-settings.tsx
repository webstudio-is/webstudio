import { useState, useEffect, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
  type Page,
  findPageByIdOrPath,
  getPageDraftabilityError,
  isPageDraft,
  isLiteralExpression,
} from "@webstudio-is/sdk";
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
  DropdownMenuItem,
} from "@webstudio-is/design-system";
import {
  $authPermit,
  $isContentMode,
  $isDesignMode,
  $permissions,
} from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import { $pages } from "~/shared/sync/data-stores";
import { $pageRootScope, duplicatePage } from "../page-utils";
import {
  computePageSettingsPath,
  getInitialPageSettingsMeta,
  getPageSettingsValues,
  nameToPath,
  pageSettingsDefaultValues,
  validatePageSettings,
  type PageSettingsErrors,
  type PageSettingsValues,
} from "@webstudio-is/project-build/runtime";
import { findMatchingRedirect } from "@webstudio-is/project-build/runtime";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { Form } from "../form";
import { isContentModePagePath } from "@webstudio-is/project-build/runtime";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { AuthSection } from "./section-auth";
import { CustomMetadataSection } from "./section-custom-metadata";
import { GeneralSection } from "./section-general";
import { MarketplaceSection } from "./section-marketplace";
import { SearchSection } from "./section-search";
import { SocialImageSection } from "./section-social-image";
import { TextContentSection } from "./section-text-content";
import { type OnChange } from "./shared";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { copyPage } from "~/shared/copy-paste/copy-paste";
import { PageItemActionsDropdown } from "../page-item-actions";

const emptyUnsavedValues: Partial<PageSettingsValues> = {};

const isEmptyCustomMetasPlaceholder = (
  customMetas: PageSettingsValues["customMetas"]
) => {
  const [customMeta] = customMetas;
  return (
    customMetas.length === 1 &&
    customMeta?.property === "" &&
    customMeta.content === `""`
  );
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
  errors: PageSettingsErrors;
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
  computePageSettingsPath,
  canEditPagePathInMode,
  validatePageSettings,
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
  canSetHomePage = true,
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
  errors: PageSettingsErrors;
  values: PageSettingsValues;
  onChange: OnChange;
  showAuthErrors?: boolean;
  isEditorContext?: boolean;
  nameLabel?: string;
  canEditName?: boolean;
  canEditPath?: boolean;
  showHomePageControl?: boolean;
  canSetHomePage?: boolean;
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
        computePageSettingsPath(values, pages),
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
            canSetHomePage={canSetHomePage}
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

  const [values, setValues] = useState<PageSettingsValues>({
    ...pageSettingsDefaultValues,
    parentFolderId:
      pages?.rootFolderId ?? pageSettingsDefaultValues.parentFolderId,
    path: nameToPath(pages, pageSettingsDefaultValues.name),
  });
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const { variableValues } = useStore($pageRootScope);
  const errors = validatePageSettings({
    pages,
    pageId: undefined,
    values,
    variableValues,
  });

  const handleSubmit = () => {
    setIsSubmitAttempted(true);
    if (Object.keys(errors).length === 0) {
      const pageId = createPage(values);
      if (pageId !== undefined) {
        updatePage(pageId, values);
        onSuccess(pageId);
      }
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

const createPage = (values: PageSettingsValues) => {
  const result = executeRuntimeMutation({
    id: "pages.create",
    input: {
      name: values.name,
      path: values.path,
      title: values.title,
      parentFolderId: values.parentFolderId,
      meta: getInitialPageSettingsMeta(values),
    },
  });
  return result?.result.pageId as Page["id"] | undefined;
};

export const updatePage = (
  pageId: Page["id"],
  values: Partial<PageSettingsValues>
) => {
  executeRuntimeMutation({
    id: "pages.updateSettings",
    input: { pageId, values },
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
  const canChangeDraftState =
    page !== undefined &&
    pages !== undefined &&
    getPageDraftabilityError({
      pageId: page.id,
      pagePath: page.path,
      homePageId: pages.homePageId,
    }) === undefined;

  const [refreshDebounce, setRefreshDebounce] = useState(0);
  let errors: PageSettingsErrors = {};
  const {
    value: unsavedValues,
    set: setUnsavedValues,
    flush: flushSave,
  } = useDraftValue<Partial<PageSettingsValues>>(
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
    if (
      page?.meta.custom !== undefined &&
      event.field === "customMetas" &&
      isEmptyCustomMetasPlaceholder(event.value)
    ) {
      return;
    }
    setUnsavedValues((values) => ({
      ...values,
      [event.field]: event.value,
    }));
    if (event.field === "isHomePage") {
      setRefreshDebounce((prev) => prev + 1);
    }
  };

  const values: PageSettingsValues = {
    ...(page
      ? getPageSettingsValues({ page, pages, isHomePage })
      : pageSettingsDefaultValues),
    ...unsavedValues,
  };

  const { variableValues } = useStore($pageRootScope);
  errors = validatePageSettings({ pages, pageId, values, variableValues });
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
        draftAction={
          canChangeDraftState === false
            ? undefined
            : {
                label: isPageDraft(page)
                  ? "Stage for publish"
                  : "Mark as draft",
                onSelect: () => {
                  executeRuntimeMutation({
                    id: "pages.update",
                    input: {
                      pageId,
                      values: { isDraft: isPageDraft(page) === false },
                    },
                  });
                },
              }
        }
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
          canSetHomePage={isPageDraft(page) === false}
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
  draftAction,
  children,
}: {
  onCopy: () => void;
  onDelete?: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  draftAction?: { label: string; onSelect: () => void };
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
              additionalItems={
                draftAction && (
                  <DropdownMenuItem onSelect={draftAction.onSelect}>
                    {draftAction.label}
                  </DropdownMenuItem>
                )
              }
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
