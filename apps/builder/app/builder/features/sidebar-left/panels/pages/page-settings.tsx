import { nanoid } from "nanoid";
import { z } from "zod";
import { type FocusEventHandler, useState, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
import { useUnmount } from "react-use";
import slugify from "slugify";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  type Page,
  type Pages,
  PageName,
  HomePagePath,
  PageTitle,
  PagePath,
  Folder,
  getPagePath,
  findPageByIdOrPath,
  ROOT_FOLDER_ID,
  findParentFolderByChildId,
} from "@webstudio-is/sdk";
import {
  theme,
  Button,
  Box,
  Label,
  TextArea,
  InputErrorsTooltip,
  Tooltip,
  InputField,
  Grid,
  Checkbox,
  Separator,
  Text,
  ScrollArea,
  rawTheme,
  Flex,
  Select,
} from "@webstudio-is/design-system";
import {
  ChevronDoubleLeftIcon,
  CopyIcon,
  TrashIcon,
  CheckMarkIcon,
  LinkIcon,
  HomeIcon,
  HelpIcon,
} from "@webstudio-is/icons";
import { useIds } from "~/shared/form-utils";
import { Header, HeaderSuffixSpacer } from "../../header";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  $assets,
  $domains,
  $instances,
  $pages,
  $project,
  $selectedInstanceSelector,
  $dataSources,
  computeExpression,
} from "~/shared/nano-states";
import {
  BindingControl,
  BindingPopover,
  isLiteralExpression,
} from "~/builder/shared/binding-popover";
import { serverSyncStore } from "~/shared/sync";
import { SearchPreview } from "./search-preview";
// @todo should be moved to shared because features should not depend on features
import { ImageControl } from "~/builder/features/project-settings";
import { ImageInfo } from "./image-info";
import { SocialPreview } from "./social-preview";
// @todo should be moved to shared because features should not depend on features
import { useEffectEvent } from "~/builder/features/ai/hooks/effect-event";
import { CustomMetadata } from "./custom-metadata";
import env from "~/shared/env";
import { parsePathnamePattern, validatePathnamePattern } from "./url-pattern";
import {
  registerFolderChildMutable,
  deletePageMutable,
  $pageRootScope,
  duplicatePage,
} from "./page-utils";
import { Form } from "./form";
import { AddressBar, useAddressBar, type AddressBarApi } from "./address-bar";

const fieldDefaultValues = {
  name: "Untitled",
  parentFolderId: ROOT_FOLDER_ID,
  path: "/untitled",
  isHomePage: false,
  title: `"Untitled"`,
  description: `""`,
  excludePageFromSearch: `false`,
  socialImageUrl: `""`,
  socialImageAssetId: "",
  customMetas: [
    {
      property: "",
      content: `""`,
    },
  ],
};

const fieldNames = Object.keys(
  fieldDefaultValues
) as (keyof typeof fieldDefaultValues)[];

type FieldName = (typeof fieldNames)[number];

type Values = typeof fieldDefaultValues;

type Errors = {
  [fieldName in FieldName]?: string[];
};

// @todo needs to be removed
const LegacyPagePath = z
  .string()
  .refine((path) => path !== "", "Can't be empty")
  .refine((path) => path !== "/", "Can't be just a /")
  .refine((path) => path === "" || path.startsWith("/"), "Must start with a /")
  .refine((path) => path.endsWith("/") === false, "Can't end with a /")
  .refine((path) => path.includes("//") === false, "Can't contain repeating /")
  .refine(
    (path) => /^[-_a-z0-9\\/]*$/.test(path),
    "Only a-z, 0-9, -, _, / are allowed"
  )
  .refine(
    // We use /s for our system stuff like /s/css or /s/uploads
    (path) => path !== "/s" && path.startsWith("/s/") === false,
    "/s prefix is reserved for the system"
  )
  .refine(
    // Remix serves build artefacts like JS bundles from /build
    // And we cannot customize it due to bug in Remix: https://github.com/remix-run/remix/issues/2933
    (path) => path !== "/build" && path.startsWith("/build/") === false,
    "/build prefix is reserved for the system"
  );

const SharedPageValues = z.object({
  name: PageName,
  title: PageTitle,
  description: z.string().optional(),
  excludePageFromSearch: z.boolean().optional(),
  socialImageUrl: z.string().optional(),
  customMetas: z
    .array(
      z.object({
        property: z.string(),
        content: z.string(),
      })
    )
    .optional(),
});

const HomePageValues = SharedPageValues.extend({
  path: HomePagePath,
});

const PageValues = SharedPageValues.extend({
  path: isFeatureEnabled("cms") ? PagePath : LegacyPagePath,
});

const isPathUnique = (
  pages: Pages,
  // undefined page id means new page
  pageId: undefined | Page["id"],
  path: string
) => {
  const list = [];
  const set = new Set();
  list.push(path);
  set.add(path);
  for (const page of pages.pages) {
    if (page.id !== pageId) {
      list.push(page.path);
      set.add(page.path);
    }
  }
  return list.length === set.size;
};

const validateValues = (
  pages: undefined | Pages,
  // undefined page id means new page
  pageId: undefined | Page["id"],
  values: Values,
  isHomePage: boolean,
  variableValues: Map<string, unknown>
): Errors => {
  const computedValues = {
    name: values.name,
    path: values.path,
    title: computeExpression(values.title, variableValues),
    description: computeExpression(values.description, variableValues),
    excludePageFromSearch: computeExpression(
      values.excludePageFromSearch,
      variableValues
    ),
    socialImageUrl: computeExpression(values.socialImageUrl, variableValues),
    customMetas: values.customMetas.map((item) => ({
      property: item.property,
      content: computeExpression(item.content, variableValues),
    })),
  };
  const Validator = isHomePage ? HomePageValues : PageValues;
  const parsedResult = Validator.safeParse(computedValues);
  const errors: Errors = {};
  if (parsedResult.success === false) {
    return parsedResult.error.formErrors.fieldErrors;
  }
  if (pages !== undefined && values.path !== undefined) {
    if (isPathUnique(pages, pageId, values.path) === false) {
      errors.path = errors.path ?? [];
      errors.path.push("All paths must be unique");
    }
    const messages = validatePathnamePattern(values.path);
    if (messages.length > 0) {
      errors.path = errors.path ?? [];
      errors.path.push(...messages);
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
    parentFolderId: parentFolder?.id ?? ROOT_FOLDER_ID,
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
    isHomePage,
    customMetas: page.meta.custom ?? fieldDefaultValues.customMetas,
  };
};

const autoSelectHandler: FocusEventHandler<HTMLInputElement> = (event) =>
  event.target.select();

const CopyPageDomainAndPathButton = ({
  pageDomainAndPath,
}: {
  pageDomainAndPath: string;
}) => {
  const [pathIconState, setPathIconState] = useState<
    "link" | "copy" | "checkmark"
  >("link");

  let pathIcon = <CopyIcon />;
  if (pathIconState === "checkmark") {
    pathIcon = <CheckMarkIcon />;
  } else if (pathIconState === "link") {
    pathIcon = <LinkIcon />;
  }

  return (
    <Tooltip
      content={pathIconState === "checkmark" ? "Copied" : "Click to copy"}
    >
      <Button
        color="ghost"
        type="button"
        onPointerDown={(event) => {
          navigator.clipboard.writeText(`https://${pageDomainAndPath}`);
          setPathIconState("checkmark");
          // Prevent tooltip to be closed
          event.stopPropagation();
        }}
        // Recreating Icon without pointer-events: none cause mouse leave/enter event to be fired again
        prefix={
          <Grid align="center" css={{ pointerEvents: "none" }}>
            {pathIcon}
          </Grid>
        }
        css={{ justifySelf: "start" }}
        onMouseEnter={() => {
          setPathIconState("copy");
        }}
        onMouseLeave={() => {
          setPathIconState("link");
        }}
      >
        {pageDomainAndPath}
      </Button>
    </Tooltip>
  );
};

const FormFields = ({
  addressBar,
  disabled,
  autoSelect,
  errors,
  values,
  onChange,
}: {
  addressBar: AddressBarApi;
  disabled?: boolean;
  autoSelect?: boolean;
  errors: Errors;
  values: Values;
  onChange: (
    event: {
      [K in keyof Values]: {
        field: K;
        value: Values[K];
      };
    }[keyof Values]
  ) => void;
}) => {
  const fieldIds = useIds(fieldNames);
  const assets = useStore($assets);
  const pages = useStore($pages);
  const { variableValues, scope, aliases } = useStore($pageRootScope);

  if (pages === undefined) {
    return;
  }

  const socialImageAsset = assets.get(values.socialImageAssetId);
  const faviconAsset = assets.get(pages.meta?.faviconAssetId ?? "");

  const faviconUrl = faviconAsset?.type === "image" ? faviconAsset.name : "";

  const project = $project.get();
  const customDomain: string | undefined = $domains.get()[0];
  const projectDomain = `${project?.domain}.${
    env.PUBLISHER_HOST ?? "wstd.work"
  }`;
  const domain = customDomain ?? projectDomain;

  const publishedUrl = new URL(`https://${domain}`);

  const foldersPath = getPagePath(values.parentFolderId, pages);

  const pageDomainAndPath = [
    publishedUrl.host,
    foldersPath,
    addressBar.compiledPath,
  ]
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
  const pageUrl = `https://${pageDomainAndPath}`;

  const title = String(computeExpression(values.title, variableValues));
  const description = String(
    computeExpression(values.description, variableValues)
  );
  const socialImageUrl = String(
    computeExpression(values.socialImageUrl, variableValues)
  );
  const excludePageFromSearch = Boolean(
    computeExpression(values.excludePageFromSearch, variableValues)
  );

  return (
    <Grid css={{ height: "100%" }}>
      <ScrollArea>
        {/**
         * ----------------------========<<<Page props>>>>========----------------------
         */}
        <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
          <Grid gap={1}>
            <Label htmlFor={fieldIds.name}>Page Name</Label>
            <InputErrorsTooltip errors={errors.name}>
              <InputField
                tabIndex={1}
                color={errors.name && "error"}
                id={fieldIds.name}
                autoFocus
                onFocus={autoSelect ? autoSelectHandler : undefined}
                name="name"
                placeholder="About"
                disabled={disabled}
                value={values.name}
                onChange={(event) => {
                  onChange({ field: "name", value: event.target.value });
                }}
              />
            </InputErrorsTooltip>

            <Grid flow={"column"} gap={1} justify={"start"} align={"center"}>
              {values.isHomePage ? (
                <HomeIcon />
              ) : (
                <Checkbox
                  id={fieldIds.isHomePage}
                  onCheckedChange={() => {
                    onChange({ field: "path", value: "" });
                    onChange({
                      field: "isHomePage",
                      value: !values.isHomePage,
                    });
                  }}
                />
              )}

              <Label
                css={{
                  overflowWrap: "anywhere",
                  wordBreak: "break-all",
                }}
                htmlFor={fieldIds.isHomePage}
              >
                {values.isHomePage
                  ? `“${values.name}” is the home page`
                  : `Make “${values.name}” the home page`}
              </Label>
            </Grid>
          </Grid>

          {isFeatureEnabled("folders") && values.isHomePage === false && (
            <Grid gap={1}>
              <Label htmlFor={fieldIds.parentFolderId}>Parent Folder</Label>
              <Select
                tabIndex={1}
                css={{ zIndex: theme.zIndices[1] }}
                options={pages.folders}
                getValue={(folder) => folder.id}
                getLabel={(folder) => folder.name}
                value={pages.folders.find(
                  ({ id }) => id === values.parentFolderId
                )}
                onChange={(folder) => {
                  onChange({
                    field: "parentFolderId",
                    value: folder.id,
                  });
                }}
              />
            </Grid>
          )}

          {values.isHomePage === false && (
            <Grid gap={1}>
              <Label htmlFor={fieldIds.path}>
                <Flex align="center" css={{ gap: theme.spacing[3] }}>
                  Path
                  {isFeatureEnabled("cms") && (
                    <Tooltip
                      content={
                        "The path can include dynamic parameters like :name, which could be made optional using :name?, or have a wildcard such as /* or /:name* to store whole remaining part at the end of the URL."
                      }
                      variant="wrapped"
                    >
                      <HelpIcon
                        color={rawTheme.colors.foregroundSubtle}
                        tabIndex={0}
                      />
                    </Tooltip>
                  )}
                </Flex>
              </Label>
              <InputErrorsTooltip errors={errors.path}>
                <InputField
                  tabIndex={1}
                  color={errors.path && "error"}
                  id={fieldIds.path}
                  name="path"
                  placeholder="/about"
                  disabled={disabled}
                  value={values?.path}
                  onChange={(event) => {
                    onChange({ field: "path", value: event.target.value });
                  }}
                />
              </InputErrorsTooltip>
            </Grid>
          )}
          <AddressBar addressBar={addressBar} />
          <CopyPageDomainAndPathButton pageDomainAndPath={pageDomainAndPath} />
        </Grid>

        <Separator />

        {/**
         * ----------------------========<<<Search Results>>>>========----------------------
         */}
        <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
          <Grid gap={2}>
            <Label sectionTitle>Search</Label>
            <Text color="subtle">
              Optimize the way this page appears in search engine results pages.
            </Text>
            <Grid gap={1}>
              <Label>Search Result Preview</Label>
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
                    pageUrl={pageUrl}
                    titleLink={title}
                    snippet={description}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Grid gap={1}>
            <Label htmlFor={fieldIds.title}>Title</Label>
            <BindingControl>
              {isFeatureEnabled("cms") && (
                <BindingPopover
                  scope={scope}
                  aliases={aliases}
                  variant={
                    isLiteralExpression(values.title) ? "default" : "bound"
                  }
                  value={values.title}
                  onChange={(value) => {
                    onChange({
                      field: "title",
                      value,
                    });
                  }}
                  onRemove={(evaluatedValue) => {
                    onChange({
                      field: "title",
                      value: JSON.stringify(evaluatedValue),
                    });
                  }}
                />
              )}
              <InputErrorsTooltip errors={errors.title}>
                <InputField
                  tabIndex={1}
                  color={errors.title && "error"}
                  id={fieldIds.title}
                  name="title"
                  placeholder="My awesome project - About"
                  disabled={
                    disabled || isLiteralExpression(values.title) === false
                  }
                  value={title}
                  onChange={(event) => {
                    onChange({
                      field: "title",
                      value: JSON.stringify(event.target.value),
                    });
                  }}
                />
              </InputErrorsTooltip>
            </BindingControl>
          </Grid>

          <Grid gap={1}>
            <Label htmlFor={fieldIds.description}>Description</Label>
            <BindingControl>
              {isFeatureEnabled("cms") && (
                <BindingPopover
                  scope={scope}
                  aliases={aliases}
                  variant={
                    isLiteralExpression(values.description)
                      ? "default"
                      : "bound"
                  }
                  value={values.description}
                  onChange={(value) => {
                    onChange({
                      field: "description",
                      value,
                    });
                  }}
                  onRemove={(evaluatedValue) => {
                    onChange({
                      field: "description",
                      value: JSON.stringify(evaluatedValue),
                    });
                  }}
                />
              )}
              <InputErrorsTooltip errors={errors.description}>
                <TextArea
                  tabIndex={1}
                  state={errors.description && "invalid"}
                  id={fieldIds.description}
                  name="description"
                  disabled={
                    disabled ||
                    isLiteralExpression(values.description) === false
                  }
                  value={description}
                  onChange={(value) => {
                    onChange({
                      field: "description",
                      value: JSON.stringify(value),
                    });
                  }}
                  autoGrow
                  maxRows={10}
                />
              </InputErrorsTooltip>
            </BindingControl>
            <BindingControl>
              <Grid
                flow={"column"}
                gap={1}
                justify={"start"}
                align={"center"}
                css={{ py: theme.spacing[2] }}
              >
                {isFeatureEnabled("cms") && (
                  <BindingPopover
                    scope={scope}
                    aliases={aliases}
                    variant={
                      isLiteralExpression(values.excludePageFromSearch)
                        ? "default"
                        : "bound"
                    }
                    value={values.excludePageFromSearch}
                    onChange={(value) => {
                      onChange({
                        field: "excludePageFromSearch",
                        value,
                      });
                    }}
                    onRemove={(evaluatedValue) => {
                      onChange({
                        field: "excludePageFromSearch",
                        value: JSON.stringify(evaluatedValue),
                      });
                    }}
                  />
                )}
                <Checkbox
                  id={fieldIds.excludePageFromSearch}
                  disabled={
                    disabled ||
                    isLiteralExpression(values.excludePageFromSearch) === false
                  }
                  checked={excludePageFromSearch}
                  onCheckedChange={() => {
                    const newValue = !excludePageFromSearch;
                    onChange({
                      field: "excludePageFromSearch",
                      value: newValue.toString(),
                    });
                  }}
                />

                <InputErrorsTooltip errors={errors.excludePageFromSearch}>
                  <Label htmlFor={fieldIds.excludePageFromSearch}>
                    Exclude this page from search results
                  </Label>
                </InputErrorsTooltip>
              </Grid>
            </BindingControl>
          </Grid>
        </Grid>

        <Separator />

        {/**
         * ----------------------========<<<Social Sharing>>>>========----------------------
         */}
        <Grid gap={2} css={{ my: theme.spacing[5], mx: theme.spacing[8] }}>
          <Label htmlFor={fieldIds.socialImageAssetId} sectionTitle>
            Social Image
          </Label>
          <Text color="subtle">
            This image appears when you share a link to this page on social
            media sites. If no image is set here, the Social Image set in the
            Project Settings will be used. The optimal dimensions for the image
            are 1200x630 px or larger with a 1.91:1 aspect ratio.
          </Text>
          {isFeatureEnabled("cms") && (
            <BindingControl>
              <BindingPopover
                scope={scope}
                aliases={aliases}
                variant={
                  isLiteralExpression(values.socialImageUrl)
                    ? "default"
                    : "bound"
                }
                value={values.socialImageUrl}
                onChange={(value) => {
                  onChange({
                    field: "socialImageUrl",
                    value,
                  });
                }}
                onRemove={(evaluatedValue) => {
                  onChange({
                    field: "socialImageUrl",
                    value: JSON.stringify(evaluatedValue),
                  });
                }}
              />
              <InputErrorsTooltip errors={errors.socialImageUrl}>
                <InputField
                  placeholder="https://www.url.com"
                  disabled={
                    disabled ||
                    isLiteralExpression(values.socialImageUrl) === false
                  }
                  color={errors.socialImageUrl && "error"}
                  value={socialImageUrl}
                  onChange={(event) => {
                    onChange({
                      field: "socialImageUrl",
                      value: JSON.stringify(event.target.value),
                    });
                    onChange({ field: "socialImageAssetId", value: "" });
                  }}
                />
              </InputErrorsTooltip>
            </BindingControl>
          )}
          <Grid gap={1} flow={"column"}>
            <ImageControl
              onAssetIdChange={(socialImageAssetId) => {
                onChange({
                  field: "socialImageAssetId",
                  value: socialImageAssetId,
                });
                onChange({ field: "socialImageUrl", value: "" });
              }}
            >
              <Button
                id={fieldIds.socialImageAssetId}
                css={{ justifySelf: "start" }}
                color="neutral"
              >
                Choose Image From Assets
              </Button>
            </ImageControl>
          </Grid>

          {socialImageAsset?.type === "image" && (
            <ImageInfo
              asset={socialImageAsset}
              onDelete={() => {
                onChange({
                  field: "socialImageAssetId",
                  value: "",
                });
              }}
            />
          )}
          <div />
          <SocialPreview
            ogImageUrl={
              socialImageAsset?.type === "image"
                ? socialImageAsset.name
                : socialImageUrl
            }
            ogUrl={pageUrl}
            ogTitle={title}
            ogDescription={description}
          />
        </Grid>

        <Separator />

        <InputErrorsTooltip errors={errors.customMetas}>
          <div>
            <CustomMetadata
              customMetas={values.customMetas}
              onChange={(customMetas) => {
                onChange({
                  field: "customMetas",
                  value: customMetas,
                });
              }}
            />
          </div>
        </InputErrorsTooltip>
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
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (pageId: Page["id"]) => void;
}) => {
  const pages = useStore($pages);

  const [values, setValues] = useState<Values>({
    ...fieldDefaultValues,
    path: nameToPath(pages, fieldDefaultValues.name),
  });
  const { variableValues } = useStore($pageRootScope);
  const errors = validateValues(
    pages,
    undefined,
    values,
    false,
    variableValues
  );
  const addressBar = useAddressBar({
    path: values.path,
  });

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const pageId = nanoid();
      createPage(pageId, values);
      updatePage(pageId, values, addressBar);
      onSuccess(pageId);
    }
  };

  return (
    <NewPageSettingsView
      onSubmit={handleSubmit}
      onClose={onClose}
      isSubmitting={false}
    >
      <FormFields
        autoSelect
        addressBar={addressBar}
        errors={errors}
        disabled={false}
        values={values}
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
  onClose,
  children,
}: {
  onSubmit: () => void;
  isSubmitting: boolean;
  onClose: () => void;
  children: JSX.Element;
}) => {
  return (
    <>
      <Header
        title="New Page Settings"
        suffix={
          <>
            <Tooltip content="Cancel" side="bottom">
              <Button
                onClick={onClose}
                aria-label="Cancel"
                prefix={<ChevronDoubleLeftIcon />}
                color="ghost"
                // Tab should go:
                //   trought form fields -> create button -> cancel button
                tabIndex={3}
              />
            </Tooltip>
            <HeaderSuffixSpacer />
            <Button
              state={isSubmitting ? "pending" : "auto"}
              onClick={onSubmit}
              tabIndex={2}
            >
              {isSubmitting ? "Creating" : "Create page"}
            </Button>
          </>
        }
      />
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
      pages.pages.push({
        id: pageId,
        name: values.name,
        path: values.path,
        title: values.title,
        rootInstanceId,
        meta: {},
      });

      instances.set(rootInstanceId, {
        type: "instance",
        id: rootInstanceId,
        component: "Body",
        children: [],
      });

      registerFolderChildMutable(pages.folders, pageId, values.parentFolderId);
      $selectedInstanceSelector.set(undefined);
    }
  );
};

const updatePage = (
  pageId: Page["id"],
  values: Partial<Values>,
  addressBar: AddressBarApi
) => {
  const updatePageMutable = (
    page: Page,
    values: Partial<Values>,
    folders: Array<Folder>
  ) => {
    if (values.name !== undefined) {
      page.name = values.name;
    }
    if (values.path !== undefined) {
      page.path = values.path;
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

    if (values.parentFolderId !== undefined) {
      registerFolderChildMutable(folders, page.id, values.parentFolderId);
    }
  };

  serverSyncStore.createTransaction(
    [$pages, $dataSources],
    (pages, dataSources) => {
      if (pages === undefined) {
        return;
      }

      // swap home page
      if (values.isHomePage && pages.homePage.id !== pageId) {
        const newHomePageIndex = pages.pages.findIndex(
          (page) => page.id === pageId
        );
        if (newHomePageIndex === -1) {
          throw new Error(`Page with id ${pageId} not found`);
        }

        const tmp = pages.homePage;
        pages.homePage = pages.pages[newHomePageIndex];

        pages.homePage.path = "";
        pages.pages[newHomePageIndex] = tmp;

        tmp.path = nameToPath(pages, tmp.name);
      }

      if (pages.homePage.id === pageId) {
        updatePageMutable(pages.homePage, values, pages.folders);
      }

      for (const page of pages.pages) {
        if (page.id === pageId) {
          // mutate page before working with path params
          updatePageMutable(page, values, pages.folders);
          // create "Path Params" variable when pattern is specified in path
          const paramNames = parsePathnamePattern(page.path);

          if (paramNames.length > 0 && page.pathVariableId === undefined) {
            page.pathVariableId = nanoid();
            dataSources.set(page.pathVariableId, {
              id: page.pathVariableId,
              // scope new variable to page root
              scopeInstanceId: page.rootInstanceId,
              type: "parameter",
              name: "Path Params",
            });
          }
        }
      }
    }
  );
  addressBar.savePathParams();
};

export const PageSettings = ({
  onClose,
  onDuplicate,
  onDelete,
  pageId,
}: {
  onClose: () => void;
  onDuplicate: (newPageId: string) => void;
  onDelete: () => void;
  pageId: string;
}) => {
  const pages = useStore($pages);
  const page = pages && findPageByIdOrPath(pageId, pages);

  const isHomePage = page?.id === pages?.homePage.id;

  const [unsavedValues, setUnsavedValues] = useState<Partial<Values>>({});

  const values: Values = {
    ...(page ? toFormValues(page, pages, isHomePage) : fieldDefaultValues),
    ...unsavedValues,
  };

  const { variableValues } = useStore($pageRootScope);
  const errors = validateValues(
    pages,
    pageId,
    values,
    values.isHomePage,
    variableValues
  );
  const addressBar = useAddressBar({
    path: values.path,
    dataSourceId: page?.pathVariableId,
  });

  const debouncedFn = useEffectEvent(() => {
    if (
      Object.keys(unsavedValues).length === 0 ||
      Object.keys(errors).length !== 0
    ) {
      return;
    }

    updatePage(pageId, unsavedValues, addressBar);

    setUnsavedValues({});
  });

  const handleSubmitDebounced = useDebouncedCallback(debouncedFn, 1000);

  const handleChange = useCallback(
    <Name extends FieldName>(event: { field: Name; value: Values[Name] }) => {
      setUnsavedValues((values) => ({
        ...values,
        [event.field]: event.value,
      }));
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
    updatePage(pageId, unsavedValues, addressBar);
  });

  const hanldeDelete = () => {
    updateWebstudioData((data) => {
      deletePageMutable(pageId, data);
      onDelete();
    });
  };

  if (page === undefined) {
    return null;
  }

  return (
    <PageSettingsView
      onClose={onClose}
      onDelete={values.isHomePage === false ? hanldeDelete : undefined}
      onDuplicate={() => {
        const newPageId = duplicatePage(pageId);
        if (newPageId !== undefined) {
          onDuplicate(newPageId);
        }
      }}
    >
      <FormFields
        addressBar={addressBar}
        errors={errors}
        values={values}
        onChange={handleChange}
      />
    </PageSettingsView>
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
  return (
    <>
      <Header
        title="Page Settings"
        suffix={
          <>
            {onDelete && (
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
            <Tooltip content="Duplicate page" side="bottom">
              <Button
                color="ghost"
                prefix={<CopyIcon />}
                onClick={onDuplicate}
                aria-label="Duplicate page"
                tabIndex={2}
              />
            </Tooltip>
            <Tooltip content="Close page settings" side="bottom">
              <Button
                color="ghost"
                prefix={<ChevronDoubleLeftIcon />}
                onClick={onClose}
                aria-label="Close page settings"
                tabIndex={2}
              />
            </Tooltip>
          </>
        }
      />
      <Form onSubmit={onClose}>{children}</Form>
    </>
  );
};
