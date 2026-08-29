import { type FocusEventHandler, useId } from "react";
import { useStore } from "@nanostores/react";
import {
  Checkbox,
  cssVar,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  Link,
  ProChip,
  Select,
  Text,
  Tooltip,
  buttonStyle,
  theme,
} from "@webstudio-is/design-system";
import { isLiteralExpression } from "@webstudio-is/expression";
import { documentTypes, type Pages } from "@webstudio-is/sdk";
import { HomeIcon, InfoCircleIcon } from "@webstudio-is/icons";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import { $permissions } from "~/shared/nano-states";
import { $pageRootScope } from "../page-utils";
import type {
  PageSettingsErrors,
  PageSettingsValues,
} from "@webstudio-is/project-build/runtime";
import { computePageSettingsText, type OnChange } from "./shared";

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
        {allowDynamicData === false && <ProChip>PRO</ProChip>}
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
            color={cssVar("--foreground-secondary")}
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
  const parseStatus = (value: string) => {
    if (value === "") {
      return;
    }
    const number = Number(value);
    return Number.isNaN(number) || String(number) !== value ? value : number;
  };
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
            color={cssVar("--foreground-secondary")}
            tabIndex={-1}
          />
        </Tooltip>
      </Flex>
      <BindableExpressionControl
        expression={value ?? ""}
        value={String(computeExpression(value, variableValues) ?? "")}
        bound={value !== undefined && isLiteralExpression(value) === false}
        showBinding={showBindingControls}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => {
          const status = parseStatus(value);
          if (status === undefined) {
            onChange(undefined);
            return;
          }
          onChange(JSON.stringify(status));
        }}
        onChangeExpression={onChange}
        onRemove={(value) => onChange(JSON.stringify(value ?? ""))}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputErrorsTooltip errors={errors}>
            <InputField
              inputMode="numeric"
              color={errors && "error"}
              id={id}
              placeholder="200"
              disabled={disabled || readOnly}
              value={value}
              onChange={(event) => onChangeValue(event.target.value)}
            />
          </InputErrorsTooltip>
        )}
      />
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
        {allowDynamicData === false && <ProChip>PRO</ProChip>}
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
            color={cssVar("--foreground-secondary")}
            tabIndex={-1}
          />
        </Tooltip>
      </Flex>

      <BindableExpressionControl
        expression={value ?? ""}
        value={computePageSettingsText(value, variableValues)}
        bound={value !== undefined && isLiteralExpression(value) === false}
        showBinding={showBindingControls}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => onChange(JSON.stringify(value))}
        onChangeExpression={onChange}
        onRemove={(value) => onChange(JSON.stringify(value ?? ""))}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputErrorsTooltip errors={errors}>
            <InputField
              color={errors && "error"}
              id={id}
              placeholder="/another-path"
              disabled={disabled || readOnly}
              value={value}
              onChange={(event) => onChangeValue(event.target.value)}
            />
          </InputErrorsTooltip>
        )}
      />
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
  canSetHomePage = true,
  showPathField = true,
  showStatusField = true,
  showRedirectField = true,
  showDocumentTypeField = true,
  showBindingControls = true,
  onChange,
}: {
  autoSelect?: boolean;
  errors: PageSettingsErrors;
  values: PageSettingsValues;
  pages: Pages;
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
            ) : canSetHomePage === false ? (
              <>
                <HomeIcon color={cssVar("--foreground-secondary")} />
                <Text color="subtle">
                  Stage this page for publish before setting it as the home page
                </Text>
              </>
            ) : values.parentFolderId !== pages.rootFolderId ? (
              <>
                <HomeIcon color={cssVar("--foreground-secondary")} />
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
                <HomeIcon color={cssVar("--foreground-secondary")} />
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
