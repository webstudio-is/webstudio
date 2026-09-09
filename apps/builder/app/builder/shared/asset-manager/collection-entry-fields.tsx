import {
  collectionEntryFieldClearValue,
  type CollectionField,
  type ContentCollectionConfig,
} from "@webstudio-is/content-engine";
import {
  Grid,
  InputField,
  ResettableLabel,
  ToggleGroup,
  ToggleGroupButton,
  Text,
  TextArea,
  theme,
} from "@webstudio-is/design-system";

const optionalBooleanOptions = [
  { value: "unset", label: "Not set" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const;

/** The same field controls for creation and editing; callers own persistence. */
export const CollectionEntryFields = ({
  config,
  values,
  errors = [],
  disabled = false,
  onChange,
  onReset,
  readOnlySlug = false,
}: {
  config: ContentCollectionConfig;
  values: Readonly<Record<string, unknown>>;
  errors?: readonly { fieldKey?: string; message: string }[];
  disabled?: boolean;
  readOnlySlug?: boolean;
  onChange: (field: CollectionField, value: unknown) => void;
  onReset: (field: CollectionField) => void;
}) => (
  <>
    {config.fields.map((field) => {
      const value = values[field.key];
      const hasValue =
        value !== "" &&
        value !== undefined &&
        value !== collectionEntryFieldClearValue;
      const id = `collection-entry-${field.key}`;
      const error = errors.find((issue) => issue.fieldKey === field.key);
      const hasFieldError = error !== undefined;
      const errorId = hasFieldError ? `${id}-error` : undefined;
      const booleanField = field.type === "boolean";
      return (
        <Grid
          key={field.key}
          gap={1}
          css={{
            gridTemplateColumns: booleanField ? "1fr auto" : undefined,
            alignItems: "center",
          }}
        >
          <ResettableLabel
            htmlFor={id}
            color={hasValue ? "local" : "default"}
            disabled={
              disabled || (readOnlySlug && field.key === config.slugField)
            }
            onReset={hasValue ? () => onReset(field) : undefined}
            description={
              field.key === config.slugField
                ? readOnlySlug
                  ? "The slug identifies this entry’s filename and cannot be renamed."
                  : config.generateSlugFrom === undefined
                    ? "Enter a slug for this entry. It becomes the MDX filename."
                    : `Generated from ${config.fields.find(({ key }) => key === config.generateSlugFrom)?.label ?? config.generateSlugFrom}. You can edit it before creating the entry. It becomes the MDX filename.`
                : undefined
            }
          >
            {field.label}
            {field.required ? " *" : ""}
          </ResettableLabel>
          {booleanField ? (
            <ToggleGroup
              id={id}
              type="single"
              aria-label={field.label}
              aria-describedby={errorId}
              aria-invalid={hasFieldError || undefined}
              value={
                value === true ? "true" : value === false ? "false" : "unset"
              }
              disabled={
                disabled || (readOnlySlug && field.key === config.slugField)
              }
              onValueChange={(value) =>
                value === "unset"
                  ? onReset(field)
                  : onChange(field, value === "true")
              }
            >
              {optionalBooleanOptions
                .filter(({ value }) => !field.required || value !== "unset")
                .map(({ value, label }) => (
                  <ToggleGroupButton
                    key={value}
                    value={value}
                    css={{
                      width: "auto",
                      paddingInline: theme.spacing[3],
                    }}
                  >
                    {label}
                  </ToggleGroupButton>
                ))}
            </ToggleGroup>
          ) : field.control === "textarea" ? (
            <TextArea
              id={id}
              required={field.required}
              aria-required={field.required}
              aria-describedby={errorId}
              aria-invalid={hasFieldError || undefined}
              value={typeof value === "string" ? value : ""}
              disabled={
                disabled || (readOnlySlug && field.key === config.slugField)
              }
              onChange={(value) => onChange(field, value)}
            />
          ) : (
            <InputField
              id={id}
              type={
                field.type === "number" || field.type === "integer"
                  ? "number"
                  : "text"
              }
              min={field.minimum}
              max={field.maximum}
              step={field.type === "integer" ? 1 : undefined}
              required={field.required}
              aria-required={field.required}
              aria-describedby={errorId}
              aria-invalid={hasFieldError || undefined}
              color={hasFieldError ? "error" : undefined}
              value={typeof value === "string" ? value : String(value ?? "")}
              disabled={
                disabled || (readOnlySlug && field.key === config.slugField)
              }
              onChange={(event) => {
                if (
                  (field.type === "number" || field.type === "integer") &&
                  event.target.value === ""
                ) {
                  onReset(field);
                  return;
                }
                onChange(field, event.target.value);
              }}
            />
          )}
          {hasFieldError && (
            <Text
              id={errorId}
              role="alert"
              color="destructive"
              css={{ gridColumn: "1 / -1" }}
            >
              {error.message}
            </Text>
          )}
        </Grid>
      );
    })}
  </>
);
