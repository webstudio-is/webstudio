import { type FocusEventHandler, useId } from "react";
import { useStore } from "@nanostores/react";
import { z } from "zod";
import {
  Checkbox,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  Link,
  ProBadge,
  Select,
  Text,
  Tooltip,
  buttonStyle,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import {
  homePagePath,
  pageName,
  pagePath,
  projectNewRedirectPath,
  documentTypes,
  getPagePath,
  isLiteralExpression,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import { HomeIcon, InfoCircleIcon } from "@webstudio-is/icons";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { computeExpression } from "@webstudio-is/project-build/runtime/data";
import { $permissions } from "~/shared/nano-states";
import { $pageRootScope } from "../page-utils";
import { isPathAvailable } from "@webstudio-is/project-build/runtime/pages";
import { validatePathnamePattern } from "~/builder/shared/url-pattern";
import {
  LOOP_ERROR,
  wouldCreateLoop,
} from "~/shared/redirects/redirect-loop-detection";
import type { Errors, OnChange, Values } from "./shared";

// 2xx, 3xx, 4xx, 5xx
const statusRegex = /^[2345]\d\d$/;
const status = z
  .number()
  .refine(
    (value) => statusRegex.test(String(value)),
    "Status code expects 2xx, 3xx, 4xx or 5xx"
  );

const generalValues = z.object({
  name: pageName,
  path: pagePath,
  status: status.optional(),
  redirect: z.optional(projectNewRedirectPath.or(z.literal(""))),
  documentType: z.optional(z.enum(documentTypes)),
});

const homePageGeneralValues = generalValues.extend({
  path: homePagePath,
});

const computePageRoute = (values: Values, pages: Pages) => {
  if (values.isHomePage) {
    return "/";
  }
  const foldersPath = getPagePath(values.parentFolderId, pages);
  return [foldersPath, values.path]
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
};

export const validateGeneralSection = ({
  pages,
  pageId,
  values,
  variableValues,
}: {
  pages: undefined | Pages;
  pageId: undefined | Page["id"];
  values: Values;
  variableValues: Map<string, unknown>;
}): Errors => {
  const computedValues = {
    name: values.name,
    path: values.path,
    status: computeExpression(values.status ?? `undefined`, variableValues),
    redirect: computeExpression(values.redirect, variableValues),
    documentType: values.documentType,
  };

  const validator = values.isHomePage ? homePageGeneralValues : generalValues;
  const parsedResult = validator.safeParse(computedValues);
  const errors: Errors = {};
  if (parsedResult.success === false) {
    Object.assign(errors, parsedResult.error.formErrors.fieldErrors);
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
  }

  if (
    pages !== undefined &&
    values.path !== undefined &&
    computedValues.redirect &&
    typeof computedValues.redirect === "string" &&
    computedValues.redirect !== ""
  ) {
    const existingRedirects = pages.redirects ?? [];
    if (
      wouldCreateLoop(
        computePageRoute(values, pages),
        computedValues.redirect,
        existingRedirects
      )
    ) {
      errors.redirect = errors.redirect ?? [];
      errors.redirect.push(LOOP_ERROR);
    }
  }

  return errors;
};

const autoSelectHandler: FocusEventHandler<HTMLInputElement> = (event) =>
  event.target.select();

const PathField = ({
  errors,
  value,
  disabled,
  onChange,
}: {
  errors?: string[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) => {
  const { allowDynamicData } = useStore($permissions);
  const id = useId();
  return (
    <Grid gap={1}>
      <Flex align="center" gap={1}>
        <Label htmlFor={id}>Path</Label>
        {allowDynamicData === false && <ProBadge>PRO</ProBadge>}
        <Tooltip
          content={
            <>
              <Text>
                The path can include dynamic parameters like :name, which could
                be made optional using :name?, or have a wildcard such as /* or
                /:name* to store whole remaining part at the end of the URL.
              </Text>
              {allowDynamicData === false && (
                <>
                  <br />
                  <Text>
                    To make the path dynamic and use it with CMS, you can use
                    parameters and other features. You can publish to staging
                    for free; upgrade to Pro to publish to custom domains.
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
          <InfoCircleIcon
            color={rawTheme.colors.foregroundSubtle}
            tabIndex={-1}
          />
        </Tooltip>
      </Flex>
      <InputErrorsTooltip errors={errors}>
        <InputField
          color={errors && "error"}
          id={id}
          placeholder="/about"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </InputErrorsTooltip>
    </Grid>
  );
};

const StatusField = ({
  errors,
  value = `undefined`,
  disabled,
  showBindingControls = true,
  onChange,
}: {
  errors?: string[];
  value: undefined | string;
  disabled?: boolean;
  showBindingControls?: boolean;
  onChange: (value: undefined | string) => void;
}) => {
  const id = useId();
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  return (
    <Grid gap={1}>
      <Flex align="center" gap={1}>
        <Label htmlFor={id}>Status code </Label>
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
          <InfoCircleIcon
            color={rawTheme.colors.foregroundSubtle}
            tabIndex={-1}
          />
        </Tooltip>
      </Flex>
      <BindingControl>
        {showBindingControls && (
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={isLiteralExpression(value) ? "default" : "bound"}
            value={value}
            onChange={onChange}
            onRemove={(evaluatedValue) =>
              onChange(JSON.stringify(evaluatedValue ?? ""))
            }
          />
        )}
        <InputErrorsTooltip errors={errors}>
          <InputField
            inputMode="numeric"
            color={errors && "error"}
            id={id}
            placeholder="200"
            disabled={disabled || isLiteralExpression(value) === false}
            value={String(computeExpression(value, variableValues) ?? "")}
            onChange={(event) => {
              if (event.target.value === "") {
                onChange(undefined);
              } else {
                const number = Number(event.target.value);
                const status =
                  Number.isNaN(number) || String(number) !== event.target.value
                    ? event.target.value
                    : number;
                onChange(JSON.stringify(status));
              }
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
  disabled,
  showBindingControls = true,
  onChange,
}: {
  errors?: string[];
  value: string;
  disabled?: boolean;
  showBindingControls?: boolean;
  onChange: (value: string) => void;
}) => {
  const id = useId();
  const { allowDynamicData } = useStore($permissions);
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  return (
    <Grid gap={1}>
      <Flex align="center" gap={1}>
        <Label htmlFor={id}>Redirect </Label>
        {allowDynamicData === false && <ProBadge>PRO</ProBadge>}
        <Tooltip
          content={
            <>
              <Text>
                Redirect value can be a path or an expression that returns a
                path for dynamic response handling.
              </Text>
              {allowDynamicData === false && (
                <>
                  <br />
                  <Text>
                    Redirects are a Pro publishing feature. You can publish to
                    staging for free; upgrade to Pro to publish to custom
                    domains.
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
          <InfoCircleIcon
            color={rawTheme.colors.foregroundSubtle}
            tabIndex={-1}
          />
        </Tooltip>
      </Flex>

      <BindingControl>
        {showBindingControls && (
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={isLiteralExpression(value) ? "default" : "bound"}
            value={value}
            onChange={onChange}
            onRemove={(evaluatedValue) =>
              onChange(JSON.stringify(evaluatedValue ?? ""))
            }
          />
        )}
        <InputErrorsTooltip errors={errors}>
          <InputField
            color={errors && "error"}
            id={id}
            placeholder="/another-path"
            disabled={disabled || isLiteralExpression(value) === false}
            value={String(computeExpression(value, variableValues))}
            onChange={(event) => onChange(JSON.stringify(event.target.value))}
          />
        </InputErrorsTooltip>
      </BindingControl>
    </Grid>
  );
};

export const GeneralSection = ({
  autoSelect,
  errors,
  values,
  pages,
  isEditorContext = false,
  nameLabel = "Page name",
  canEditName = true,
  canEditPath = true,
  showHomePageControl = true,
  showPathField = true,
  showStatusField = true,
  showRedirectField = true,
  showDocumentTypeField = true,
  showBindingControls = true,
  onChange,
}: {
  autoSelect?: boolean;
  errors: Errors;
  values: Values;
  pages: Pages;
  isEditorContext?: boolean;
  nameLabel?: string;
  canEditName?: boolean;
  canEditPath?: boolean;
  showHomePageControl?: boolean;
  showPathField?: boolean;
  showStatusField?: boolean;
  showRedirectField?: boolean;
  showDocumentTypeField?: boolean;
  showBindingControls?: boolean;
  onChange: OnChange;
}) => {
  const nameId = useId();
  const isHomePageId = useId();
  const documentTypeId = useId();
  return (
    <>
      <Grid gap={1}>
        <Label htmlFor={nameId}>{nameLabel}</Label>
        <InputErrorsTooltip errors={errors.name}>
          <InputField
            color={errors.name && "error"}
            id={nameId}
            autoFocus={autoSelect}
            onFocus={autoSelect ? autoSelectHandler : undefined}
            name="name"
            placeholder="About"
            disabled={canEditName === false}
            value={values.name}
            onChange={(event) => {
              onChange({ field: "name", value: event.target.value });
            }}
          />
        </InputErrorsTooltip>

        {showHomePageControl && (
          <Grid flow={"column"} gap={1} justify={"start"} align={"center"}>
            {values.isHomePage ? (
              <>
                <HomeIcon />
                <Text
                  css={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-all",
                    my: 2,
                  }}
                >
                  “{values.name}” is the home page
                </Text>
              </>
            ) : values.parentFolderId !== pages.rootFolderId ? (
              <>
                <HomeIcon color={rawTheme.colors.foregroundSubtle} />
                <Text
                  css={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-all",
                    my: 2,
                  }}
                  color="subtle"
                >
                  Move this page to the “Root” folder to set it as your home
                  page
                </Text>
              </>
            ) : values.documentType !== "html" ? (
              <>
                <HomeIcon color={rawTheme.colors.foregroundSubtle} />
                <Text
                  css={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-all",
                    my: 2,
                  }}
                  color="subtle"
                >
                  {values.documentType.toUpperCase()} pages cannot be set as the
                  home page
                </Text>
              </>
            ) : isEditorContext ? null : (
              <>
                <Checkbox
                  id={isHomePageId}
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
                  htmlFor={isHomePageId}
                >
                  Make “{values.name}” the home page
                </Label>
              </>
            )}
          </Grid>
        )}
      </Grid>

      {showPathField && values.isHomePage === false && (
        <PathField
          errors={errors.path}
          value={values.path}
          disabled={canEditPath === false}
          onChange={(value) => onChange({ field: "path", value })}
        />
      )}

      {showStatusField && (
        <StatusField
          errors={errors.status}
          value={values.status}
          disabled={isEditorContext}
          showBindingControls={showBindingControls}
          onChange={(value) => onChange({ field: "status", value })}
        />
      )}
      {showRedirectField && (
        <RedirectField
          errors={errors.redirect}
          value={values.redirect}
          disabled={isEditorContext}
          showBindingControls={showBindingControls}
          onChange={(value) => onChange({ field: "redirect", value })}
        />
      )}

      {showDocumentTypeField && (
        <Grid gap={1}>
          <Label htmlFor={documentTypeId}>Document type</Label>
          <Select
            options={documentTypes}
            getValue={(docType: (typeof documentTypes)[number]) => docType}
            getLabel={(docType: (typeof documentTypes)[number]) =>
              docType.toUpperCase()
            }
            value={values.documentType}
            disabled={values.isHomePage || isEditorContext}
            onChange={(value) => {
              onChange({
                field: "documentType",
                value,
              });
            }}
          />
        </Grid>
      )}
    </>
  );
};
