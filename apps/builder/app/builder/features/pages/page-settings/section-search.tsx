import { useId } from "react";
import {
  Box,
  Checkbox,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  Text,
  TextArea,
  theme,
} from "@webstudio-is/design-system";
import { isLiteralExpression } from "@webstudio-is/sdk";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import type {
  PageSettingsErrors,
  PageSettingsValues,
} from "@webstudio-is/project-build/runtime";
import { useStore } from "@nanostores/react";
import { $assets, $projectSettings } from "~/shared/sync/data-stores";
import { $pageRootScope } from "../page-utils";
import { SearchPreview } from "../search-preview";
import { computePageSettingsText, usePageUrl, type OnChange } from "./shared";

const LanguageField = ({
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
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  return (
    <Grid gap={1}>
      <Label htmlFor={id}>Language</Label>
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
            placeholder="en-US"
            disabled={disabled || isLiteralExpression(value) === false}
            value={computePageSettingsText(value, variableValues)}
            onChange={(event) => onChange(JSON.stringify(event.target.value))}
          />
        </InputErrorsTooltip>
      </BindingControl>
    </Grid>
  );
};

export const SearchSection = ({
  values,
  errors,
  canEditTitle = true,
  canEditDescription = true,
  canEditExcludePageFromSearch = true,
  canEditLanguage = true,
  showBindingControls = true,
  onChange,
}: {
  values: PageSettingsValues;
  errors: PageSettingsErrors;
  canEditTitle?: boolean;
  canEditDescription?: boolean;
  canEditExcludePageFromSearch?: boolean;
  canEditLanguage?: boolean;
  showBindingControls?: boolean;
  onChange: OnChange;
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const excludePageFromSearchId = useId();
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  const assets = useStore($assets);
  const projectSettings = useStore($projectSettings);
  const pageUrl = usePageUrl(values);
  const faviconAsset = assets.get(projectSettings?.meta.faviconAssetId ?? "");
  const faviconUrl = faviconAsset?.type === "image" ? faviconAsset.name : "";
  const title = computePageSettingsText(values.title, variableValues);
  const description = computePageSettingsText(
    values.description,
    variableValues
  );
  const excludePageFromSearch = Boolean(
    computeExpression(values.excludePageFromSearch, variableValues)
  );
  return (
    <Grid gap={2}>
      <Grid gap={2}>
        <Text color="subtle">
          Optimize the way this page appears in search engine results pages.
        </Text>
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
                siteName={projectSettings?.meta.siteName ?? ""}
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
        <Label htmlFor={titleId}>Title</Label>
        <BindingControl>
          {showBindingControls && (
            <BindingPopover
              scope={scope}
              aliases={aliases}
              variant={isLiteralExpression(values.title) ? "default" : "bound"}
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
                  value: JSON.stringify(evaluatedValue ?? ""),
                });
              }}
            />
          )}
          <InputErrorsTooltip errors={errors.title}>
            <InputField
              color={errors.title && "error"}
              id={titleId}
              name="title"
              placeholder="My awesome project - About"
              disabled={
                canEditTitle === false ||
                isLiteralExpression(values.title) === false
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
        <Label htmlFor={descriptionId}>Description</Label>
        <BindingControl>
          {showBindingControls && (
            <BindingPopover
              scope={scope}
              aliases={aliases}
              variant={
                isLiteralExpression(values.description) ? "default" : "bound"
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
                  value: JSON.stringify(evaluatedValue ?? ""),
                });
              }}
            />
          )}
          <InputErrorsTooltip errors={errors.description}>
            <TextArea
              color={errors.description ? "error" : undefined}
              id={descriptionId}
              name="description"
              disabled={
                canEditDescription === false ||
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
            {showBindingControls && (
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
                    value: JSON.stringify(evaluatedValue ?? ""),
                  });
                }}
              />
            )}
            <Checkbox
              id={excludePageFromSearchId}
              disabled={
                canEditExcludePageFromSearch === false ||
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
              <Label htmlFor={excludePageFromSearchId}>
                Exclude this page from search results
              </Label>
            </InputErrorsTooltip>
          </Grid>
        </BindingControl>
      </Grid>

      <LanguageField
        errors={errors.language}
        value={values.language}
        disabled={canEditLanguage === false}
        showBindingControls={showBindingControls}
        onChange={(value) => onChange({ field: "language", value })}
      />
    </Grid>
  );
};
