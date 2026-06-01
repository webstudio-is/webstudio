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
  HomePagePath,
  PageName,
  PagePath,
  ProjectNewRedirectPath,
  documentTypes,
  isLiteralExpression,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import { HomeIcon, InfoCircleIcon } from "@webstudio-is/icons";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { computeExpression } from "~/shared/data-variables";
import { $permissions } from "~/shared/nano-states";
import { $pageRootScope, isPathAvailable } from "../page-utils";
import { validatePathnamePattern } from "~/builder/shared/url-pattern";
import {
  LOOP_ERROR,
  wouldCreateLoop,
} from "~/shared/redirects/redirect-loop-detection";
import type { Errors, OnChange, Values } from "./shared";

// 2xx, 3xx, 4xx, 5xx
const statusRegex = /^[2345]\d\d$/;
const Status = z
  .number()
  .refine(
    (value) => statusRegex.test(String(value)),
    "Status code expects 2xx, 3xx, 4xx or 5xx"
  );

const GeneralValues = z.object({
  name: PageName,
  path: PagePath,
  status: Status.optional(),
  redirect: z.optional(ProjectNewRedirectPath.or(z.literal(""))),
  documentType: z.optional(z.enum(documentTypes)),
});

const HomePageGeneralValues = GeneralValues.extend({
  path: HomePagePath,
});

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

  const Validator = values.isHomePage ? HomePageGeneralValues : GeneralValues;
  const parsedResult = Validator.safeParse(computedValues);
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
      wouldCreateLoop(values.path, computedValues.redirect, existingRedirects)
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
  onChange,
}: {
  errors?: string[];
  value: string;
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
  onChange,
}: {
  errors?: string[];
  value: undefined | string;
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
        <InputErrorsTooltip errors={errors}>
          <InputField
            inputMode="numeric"
            color={errors && "error"}
            id={id}
            placeholder="200"
            disabled={isLiteralExpression(value) === false}
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
  onChange,
}: {
  errors?: string[];
  value: string;
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
        <InputErrorsTooltip errors={errors}>
          <InputField
            color={errors && "error"}
            id={id}
            placeholder="/another-path"
            disabled={isLiteralExpression(value) === false}
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
  onChange,
}: {
  autoSelect?: boolean;
  errors: Errors;
  values: Values;
  pages: Pages;
  onChange: OnChange;
}) => {
  const nameId = useId();
  const isHomePageId = useId();
  const documentTypeId = useId();
  return (
    <>
      <Grid gap={1}>
        <Label htmlFor={nameId}>Page name</Label>
        <InputErrorsTooltip errors={errors.name}>
          <InputField
            color={errors.name && "error"}
            id={nameId}
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
                Move this page to the “Root” folder to set it as your home page
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
          ) : (
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
      </Grid>

      {values.isHomePage === false && (
        <PathField
          errors={errors.path}
          value={values.path}
          onChange={(value) => onChange({ field: "path", value })}
        />
      )}

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

      <Grid gap={1}>
        <Label htmlFor={documentTypeId}>Document type</Label>
        <Select
          options={documentTypes}
          getValue={(docType: (typeof documentTypes)[number]) => docType}
          getLabel={(docType: (typeof documentTypes)[number]) =>
            docType.toUpperCase()
          }
          value={values.documentType}
          disabled={values.isHomePage}
          onChange={(value) => {
            onChange({
              field: "documentType",
              value,
            });
          }}
        />
      </Grid>
    </>
  );
};
