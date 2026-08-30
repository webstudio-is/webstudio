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
import { isLiteralExpression } from "@webstudio-is/expression";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
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

// Search-engine previews represent an external light surface, not Builder UI.
const searchPreviewBackground = "#ffffff";
const searchPreviewBorder = "#e6e6e6";

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
      <BindableExpressionControl
        expression={value}
        value={computePageSettingsText(value, variableValues)}
        bound={isLiteralExpression(value) === false}
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
              placeholder="en-US"
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
              background: searchPreviewBackground,
              borderRadius: theme.borderRadius[4],
              border: `1px solid ${searchPreviewBorder}`,
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
        <BindableExpressionControl
          expression={values.title}
          value={title}
          bound={isLiteralExpression(values.title) === false}
          showBinding={showBindingControls}
          scope={scope}
          aliases={aliases}
          onChangeValue={(value) =>
            onChange({ field: "title", value: JSON.stringify(value) })
          }
          onChangeExpression={(value) => onChange({ field: "title", value })}
          onRemove={(value) =>
            onChange({ field: "title", value: JSON.stringify(value ?? "") })
          }
          renderControl={({ value, readOnly, onChangeValue }) => (
            <InputErrorsTooltip errors={errors.title}>
              <InputField
                color={errors.title && "error"}
                id={titleId}
                name="title"
                placeholder="My awesome project - About"
                disabled={canEditTitle === false || readOnly}
                value={value}
                onChange={(event) => onChangeValue(event.target.value)}
              />
            </InputErrorsTooltip>
          )}
        />
      </Grid>

      <Grid gap={1}>
        <Label htmlFor={descriptionId}>Description</Label>
        <BindableExpressionControl
          expression={values.description}
          value={description}
          bound={isLiteralExpression(values.description) === false}
          showBinding={showBindingControls}
          scope={scope}
          aliases={aliases}
          onChangeValue={(value) =>
            onChange({ field: "description", value: JSON.stringify(value) })
          }
          onChangeExpression={(value) =>
            onChange({ field: "description", value })
          }
          onRemove={(value) =>
            onChange({
              field: "description",
              value: JSON.stringify(value ?? ""),
            })
          }
          renderControl={({ value, readOnly, onChangeValue }) => (
            <InputErrorsTooltip errors={errors.description}>
              <TextArea
                color={errors.description ? "error" : undefined}
                id={descriptionId}
                name="description"
                disabled={canEditDescription === false || readOnly}
                value={value}
                onChange={onChangeValue}
                autoGrow
                maxRows={10}
              />
            </InputErrorsTooltip>
          )}
        />
        <BindableExpressionControl
          expression={values.excludePageFromSearch}
          value={excludePageFromSearch}
          bound={isLiteralExpression(values.excludePageFromSearch) === false}
          showBinding={showBindingControls}
          scope={scope}
          aliases={aliases}
          onChangeValue={(value) =>
            onChange({
              field: "excludePageFromSearch",
              value: value.toString(),
            })
          }
          onChangeExpression={(value) =>
            onChange({ field: "excludePageFromSearch", value })
          }
          onRemove={(value) =>
            onChange({
              field: "excludePageFromSearch",
              value: JSON.stringify(value ?? ""),
            })
          }
          renderControl={({ value, readOnly, onChangeValue }) => (
            <Grid
              flow={"column"}
              gap={1}
              justify={"start"}
              align={"center"}
              css={{ py: theme.spacing[2] }}
            >
              <Checkbox
                id={excludePageFromSearchId}
                disabled={canEditExcludePageFromSearch === false || readOnly}
                checked={value}
                onCheckedChange={() => onChangeValue(!value)}
              />

              <InputErrorsTooltip errors={errors.excludePageFromSearch}>
                <Label htmlFor={excludePageFromSearchId}>
                  Exclude this page from search results
                </Label>
              </InputErrorsTooltip>
            </Grid>
          )}
        />
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
