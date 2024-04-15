import { nanoid } from "nanoid";
import { z } from "zod";
import {
  type FocusEventHandler,
  useState,
  useCallback,
  useId,
  useEffect,
} from "react";
import { useStore } from "@nanostores/react";
import { useDebouncedCallback } from "use-debounce";
import * as bcp47 from "bcp-47";
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
  ProjectNewRedirectPath,
  DataSource,
  isLiteralExpression,
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
  Link,
  buttonStyle,
  PanelBanner,
} from "@webstudio-is/design-system";
import {
  ChevronDoubleLeftIcon,
  CopyIcon,
  TrashIcon,
  HomeIcon,
  HelpIcon,
  UploadIcon,
} from "@webstudio-is/icons";
import { useIds } from "~/shared/form-utils";
import { Header, HeaderSuffixSpacer } from "../../shared/panel";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  $assets,
  $instances,
  $pages,
  $selectedInstanceSelector,
  $dataSources,
  computeExpression,
  $dataSourceVariables,
  $publishedUrl,
} from "~/shared/nano-states";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { serverSyncStore } from "~/shared/sync";
import { SearchPreview } from "./search-preview";
// @todo should be moved to shared because features should not depend on features
import { ImageControl } from "~/builder/features/project-settings";
import { ImageInfo } from "./image-info";
import { SocialPreview } from "./social-preview";
// @todo should be moved to shared because features should not depend on features
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { CustomMetadata } from "./custom-metadata";
import {
  compilePathnamePattern,
  isPathnamePattern,
  tokenizePathnamePattern,
  validatePathnamePattern,
} from "~/builder/shared/url-pattern";
import {
  registerFolderChildMutable,
  deletePageMutable,
  $pageRootScope,
  duplicatePage,
  isRootId,
  toTreeData,
  isPathAvailable,
} from "./page-utils";
import { Form } from "./form";
import type { System } from "~/builder/features/address-bar";
import { $userPlanFeatures } from "~/builder/shared/nano-states";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import { useUnmount } from "~/shared/hook-utils/use-mount";

const fieldDefaultValues = {
  name: "Untitled",
  parentFolderId: ROOT_FOLDER_ID,
  path: "/untitled",
  isHomePage: false,
  title: `"Untitled"`,
  description: `""`,
  excludePageFromSearch: `false`,
  language: `""`,
  socialImageUrl: `""`,
  socialImageAssetId: "",
  status: `200`,
  redirect: `""`,
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

const EmptyString = z.string().refine((string) => string === "");

// 2xx, 3xx, 4xx, 5xx
const statusRegex = /^[2345]\d\d$/;
const Status = z
  .number()
  .refine(
    (value) => statusRegex.test(String(value)),
    "Status code expects 2xx, 3xx, 4xx or 5xx"
  );

const Language = z
  .string()
  .refine(
    (value) => bcp47.parse(value).language !== null,
    "The language is invalid"
  );

const SharedPageValues = z.object({
  name: PageName,
  title: PageTitle,
  description: z.string().optional(),
  excludePageFromSearch: z.boolean().optional(),
  language: Language.or(EmptyString),
  socialImageUrl: z.string().optional(),
  status: Status.optional(),
  redirect: z.optional(ProjectNewRedirectPath.or(EmptyString)),
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

const validateValues = (
  pages: undefined | Pages,
  // undefined page id means new page
  pageId: undefined | Page["id"],
  values: Values,
  isHomePage: boolean,
  variableValues: Map<string, unknown>,
  userPlanFeatures: UserPlanFeatures
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
    language: computeExpression(values.language, variableValues),
    socialImageUrl: computeExpression(values.socialImageUrl, variableValues),
    status: computeExpression(values.status, variableValues),
    redirect: computeExpression(values.redirect, variableValues),
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
    if (
      isPathAvailable({
        pages,
        path: values.path,
        parentFolderId: values.parentFolderId,
        pageId,
      }) === false
    ) {
      errors.path = errors.path ?? [];
      errors.path.push("All paths must be unique");
    }
    const messages = validatePathnamePattern(values.path);
    if (messages.length > 0) {
      errors.path = errors.path ?? [];
      errors.path.push(...messages);
    }

    if (
      userPlanFeatures.allowDynamicData === false &&
      isPathnamePattern(values.path)
    ) {
      errors.path = errors.path ?? [];
      errors.path.push("Dynamic path is supported only in Pro");
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
    language: page.meta.language ?? fieldDefaultValues.language,
    status: page.meta.status ?? fieldDefaultValues.status,
    redirect: page.meta.redirect ?? fieldDefaultValues.redirect,
    isHomePage,
    customMetas: page.meta.custom ?? fieldDefaultValues.customMetas,
  };
};

const autoSelectHandler: FocusEventHandler<HTMLInputElement> = (event) =>
  event.target.select();

const PathField = ({
  errors,
  value,
  onChange,
}: {
  errors?: string[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const { allowDynamicData } = useStore($userPlanFeatures);
  const id = useId();
  return (
    <Grid gap={1}>
      <Label htmlFor={id}>
        {allowDynamicData && isFeatureEnabled("cms") ? (
          <Flex align="center" gap={1}>
            Dynamic Path
            <Tooltip
              content="The path can include dynamic parameters like :name, which could be made optional using :name?, or have a wildcard such as /* or /:name* to store whole remaining part at the end of the URL."
              variant="wrapped"
            >
              <HelpIcon
                color={rawTheme.colors.foregroundSubtle}
                tabIndex={-1}
              />
            </Tooltip>
          </Flex>
        ) : (
          <Flex align="center" gap={1}>
            Path
            <Tooltip
              content={
                <>
                  <Text>
                    Path is a subset of the URL that looks like this:
                    &quot;/blog&quot;.
                  </Text>
                  {allowDynamicData === false && isFeatureEnabled("cms") && (
                    <>
                      <Text>
                        To make the path dynamic and use it with CMS, you can
                        use parameters and other features. CMS features are part
                        of the Pro plan.
                      </Text>
                      <Link
                        className={buttonStyle({ color: "gradient" })}
                        css={{ marginTop: theme.spacing[5], width: "100%" }}
                        color="contrast"
                        underline="none"
                        target="_blank"
                        href="https://webstudio.is/pricing"
                      >
                        Upgrade
                      </Link>
                    </>
                  )}
                </>
              }
              variant="wrapped"
            >
              <HelpIcon
                color={rawTheme.colors.foregroundSubtle}
                tabIndex={-1}
              />
            </Tooltip>
          </Flex>
        )}
      </Label>
      <InputErrorsTooltip errors={errors}>
        <InputField
          color={errors && "error"}
          id={id}
          placeholder="/about"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </InputErrorsTooltip>
    </Grid>
  );
};

const StatusField = ({
  errors,
  value,
  onChange,
}: {
  errors?: string[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const id = useId();
  const { allowDynamicData } = useStore($userPlanFeatures);
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  return (
    <Grid gap={1}>
      <Label htmlFor={id}>
        <Flex align="center" gap={1}>
          Status Code
          <Tooltip
            content={
              <Text>
                Status code value can be a{" "}
                <Link
                  color="inherit"
                  target="_blank"
                  href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status"
                >
                  HTTP Status
                </Link>{" "}
                number or an expression that returns the status code dynamic
                response handling.
              </Text>
            }
            variant="wrapped"
          >
            <HelpIcon color={rawTheme.colors.foregroundSubtle} tabIndex={-1} />
          </Tooltip>
        </Flex>
      </Label>
      <BindingControl>
        {allowDynamicData && (
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={isLiteralExpression(value) ? "default" : "bound"}
            value={value}
            onChange={onChange}
            onRemove={(evaluatedValue) =>
              onChange(JSON.stringify(evaluatedValue))
            }
          />
        )}
        <InputErrorsTooltip errors={errors}>
          <InputField
            inputMode="numeric"
            color={errors && "error"}
            id={id}
            placeholder="200"
            disabled={
              allowDynamicData === false || isLiteralExpression(value) === false
            }
            value={String(computeExpression(value, variableValues))}
            onChange={(event) => {
              const number = Number(event.target.value);
              const status =
                Number.isNaN(number) || String(number) !== event.target.value
                  ? event.target.value
                  : number;
              onChange(JSON.stringify(status));
            }}
          />
        </InputErrorsTooltip>
      </BindingControl>
    </Grid>
  );
};

const RedirectField = ({
  errors,
  value,
  onChange,
}: {
  errors?: string[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const id = useId();
  const { allowDynamicData } = useStore($userPlanFeatures);
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  return (
    <Grid gap={1}>
      <Label htmlFor={id}>
        <Flex align="center" gap={1}>
          Redirect
          <Tooltip
            content="Redirect value can be a path or an expression that returns a path for dynamic response handling."
            variant="wrapped"
          >
            <HelpIcon color={rawTheme.colors.foregroundSubtle} tabIndex={-1} />
          </Tooltip>
        </Flex>
      </Label>
      <BindingControl>
        {allowDynamicData && (
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={isLiteralExpression(value) ? "default" : "bound"}
            value={value}
            onChange={onChange}
            onRemove={(evaluatedValue) =>
              onChange(JSON.stringify(evaluatedValue))
            }
          />
        )}
        <InputErrorsTooltip errors={errors}>
          <InputField
            color={errors && "error"}
            id={id}
            placeholder="/another-path"
            disabled={
              allowDynamicData === false || isLiteralExpression(value) === false
            }
            value={String(computeExpression(value, variableValues))}
            onChange={(event) => onChange(JSON.stringify(event.target.value))}
          />
        </InputErrorsTooltip>
      </BindingControl>
    </Grid>
  );
};

const LanguageField = ({
  errors,
  value,
  onChange,
}: {
  errors?: string[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const id = useId();
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  return (
    <Grid gap={1}>
      <Label htmlFor={id}>Language</Label>
      <BindingControl>
        <BindingPopover
          scope={scope}
          aliases={aliases}
          variant={isLiteralExpression(value) ? "default" : "bound"}
          value={value}
          onChange={onChange}
          onRemove={(evaluatedValue) =>
            onChange(JSON.stringify(evaluatedValue))
          }
        />
        <InputErrorsTooltip errors={errors}>
          <InputField
            color={errors && "error"}
            id={id}
            placeholder="en-US"
            disabled={isLiteralExpression(value) === false}
            value={String(computeExpression(value, variableValues))}
            onChange={(event) => onChange(JSON.stringify(event.target.value))}
          />
        </InputErrorsTooltip>
      </BindingControl>
    </Grid>
  );
};

const usePageUrl = (values: Values, systemDataSourceId?: DataSource["id"]) => {
  const pages = useStore($pages);
  const foldersPath =
    pages === undefined ? "" : getPagePath(values.parentFolderId, pages);
  const path = [foldersPath, values.path]
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");

  const dataSourceVariables = useStore($dataSourceVariables);
  const storedSystem =
    systemDataSourceId === undefined
      ? undefined
      : (dataSourceVariables.get(systemDataSourceId) as System);
  const pathParams = storedSystem?.params ?? {};

  const publishedUrl = useStore($publishedUrl);
  const tokens = tokenizePathnamePattern(path);
  const compiledPath = compilePathnamePattern(tokens, pathParams);
  return `${publishedUrl}${compiledPath}`;
};

const FormFields = ({
  systemDataSourceId,
  autoSelect,
  errors,
  values,
  onChange,
}: {
  systemDataSourceId?: DataSource["id"];
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
  const { allowDynamicData } = useStore($userPlanFeatures);
  const { variableValues, scope, aliases } = useStore($pageRootScope);

  const pageUrl = usePageUrl(values, systemDataSourceId);

  if (pages === undefined) {
    return;
  }

  const socialImageAsset = assets.get(values.socialImageAssetId);
  const faviconAsset = assets.get(pages.meta?.faviconAssetId ?? "");

  const faviconUrl = faviconAsset?.type === "image" ? faviconAsset.name : "";

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
                color={errors.name && "error"}
                id={fieldIds.name}
                autoFocus
                onFocus={autoSelect ? autoSelectHandler : undefined}
                name="name"
                placeholder="About"
                value={values.name}
                onChange={(event) => {
                  onChange({ field: "name", value: event.target.value });
                }}
              />
            </InputErrorsTooltip>

            <Grid flow={"column"} gap={1} justify={"start"} align={"center"}>
              {values.isHomePage ? (
                <>
                  <HomeIcon />
                  <Text
                    css={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-all",
                    }}
                  >
                    “{values.name}” is the home page
                  </Text>
                </>
              ) : isRootId(values.parentFolderId) === false ? (
                <>
                  <HomeIcon color={rawTheme.colors.foregroundSubtle} />
                  <Text
                    css={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-all",
                    }}
                    color="subtle"
                  >
                    Move this page to the “{toTreeData(pages).root.name}” folder
                    to set it as your home page
                  </Text>
                </>
              ) : (
                <>
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
                  <Label
                    css={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-all",
                    }}
                    htmlFor={fieldIds.isHomePage}
                  >
                    Make “{values.name}” the home page
                  </Label>
                </>
              )}
            </Grid>
          </Grid>

          {values.isHomePage === false && (
            <Grid gap={1}>
              <Label htmlFor={fieldIds.parentFolderId}>Parent Folder</Label>
              <Select
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
            <PathField
              errors={errors.path}
              value={values.path}
              onChange={(value) => onChange({ field: "path", value })}
            />
          )}

          {isFeatureEnabled("cms") && (
            <>
              <StatusField
                errors={errors.status}
                value={values.status}
                onChange={(value) => onChange({ field: "status", value })}
              />
              <RedirectField
                errors={errors.redirect}
                value={values.redirect}
                onChange={(value) => onChange({ field: "redirect", value })}
              />
              {allowDynamicData === false && (
                <PanelBanner>
                  <Text>
                    Dynamic routing, redirect and status code are a part of the
                    CMS functionality.
                  </Text>
                  <Flex align="center" gap={1}>
                    <UploadIcon />
                    <Link
                      color="inherit"
                      target="_blank"
                      href="https://webstudio.is/pricing"
                    >
                      Upgrade to Pro
                    </Link>
                  </Flex>
                </PanelBanner>
              )}
            </>
          )}
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
                  color={errors.title && "error"}
                  id={fieldIds.title}
                  name="title"
                  placeholder="My awesome project - About"
                  disabled={isLiteralExpression(values.title) === false}
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
                  state={errors.description && "invalid"}
                  id={fieldIds.description}
                  name="description"
                  disabled={isLiteralExpression(values.description) === false}
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

          {isFeatureEnabled("cms") && (
            <LanguageField
              errors={errors.language}
              value={values.language}
              onChange={(value) => onChange({ field: "language", value })}
            />
          )}
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
  const userPlanFeatures = useStore($userPlanFeatures);
  const { variableValues } = useStore($pageRootScope);
  const errors = validateValues(
    pages,
    undefined,
    values,
    false,
    variableValues,
    userPlanFeatures
  );

  const handleSubmit = () => {
    if (Object.keys(errors).length === 0) {
      const pageId = nanoid();
      createPage(pageId, values);
      updatePage(pageId, values);
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
        errors={errors}
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
    [$pages, $instances, $dataSources],
    (pages, instances, dataSources) => {
      if (pages === undefined) {
        return;
      }
      const rootInstanceId = nanoid();
      const systemDataSourceId = nanoid();
      pages.pages.push({
        id: pageId,
        name: values.name,
        path: values.path,
        title: values.title,
        rootInstanceId,
        systemDataSourceId,
        meta: {},
      });

      instances.set(rootInstanceId, {
        type: "instance",
        id: rootInstanceId,
        component: "Body",
        children: [],
      });
      dataSources.set(systemDataSourceId, {
        id: systemDataSourceId,
        scopeInstanceId: rootInstanceId,
        name: "system",
        type: "parameter",
      });

      registerFolderChildMutable(pages.folders, pageId, values.parentFolderId);
      $selectedInstanceSelector.set(undefined);
    }
  );
};

const updatePage = (pageId: Page["id"], values: Partial<Values>) => {
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

    if (values.language !== undefined) {
      page.meta.language =
        values.language.length > 0 ? values.language : undefined;
    }

    if (values.status !== undefined) {
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

    if (values.parentFolderId !== undefined) {
      registerFolderChildMutable(folders, page.id, values.parentFolderId);
    }
  };

  serverSyncStore.createTransaction([$pages], (pages) => {
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

      const oldHomePage = pages.homePage;
      pages.homePage = pages.pages[newHomePageIndex];

      pages.homePage.path = "";

      pages.homePage.name = "Home";

      pages.pages[newHomePageIndex] = oldHomePage;

      // For simplicity skip logic in case of names are same i.e. Old Home 1, Old Home 2
      oldHomePage.name = "Old Home";
      oldHomePage.path = nameToPath(pages, oldHomePage.name);

      const rootFolder = pages.folders.find((folder) => isRootId(folder.id));

      if (rootFolder === undefined) {
        throw new Error("Root folder not found");
      }

      if (rootFolder.children === undefined) {
        throw new Error("Root folder must have children");
      }

      // Swap home to the first position in the root folder
      const childIndexOfHome = rootFolder?.children.indexOf(pages.homePage.id);

      if (childIndexOfHome === -1) {
        throw new Error("Both pages must be children of Root folder");
      }

      rootFolder.children[childIndexOfHome] = rootFolder.children[0];
      rootFolder.children[0] = pages.homePage.id;
    }

    if (pages.homePage.id === pageId) {
      updatePageMutable(pages.homePage, values, pages.folders);
    }
    for (const page of pages.pages) {
      if (page.id === pageId) {
        updatePageMutable(page, values, pages.folders);
      }
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
  const userPlanFeatures = useStore($userPlanFeatures);
  const errors = validateValues(
    pages,
    pageId,
    values,
    values.isHomePage,
    variableValues,
    userPlanFeatures
  );

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
        systemDataSourceId={page.systemDataSourceId}
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
