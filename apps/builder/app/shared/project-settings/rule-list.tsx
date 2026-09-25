import { useId, useRef, useState, type ReactNode } from "react";
import {
  Button,
  Combobox,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  List,
  ListItem,
  ScrollArea,
  Text,
  cssVar,
  theme,
} from "@webstudio-is/design-system";
import { ProjectSettingsDataRow } from "./data-row";

type Values = Record<string, string>;
type Errors = Record<string, string[]>;

type Field = {
  name: string;
  placeholder: string;
  type?: "text" | "password";
  suggestions?: readonly string[];
  autocomplete?: readonly string[] | ((values: Values) => readonly string[]);
  validateOnChange?: (value: string) => string[];
};

type Rule = {
  key: string;
  values: ReactNode[];
  actions?: ReactNode;
};

export const ProjectSettingsRuleList = ({
  fields,
  validate,
  onSubmit,
  rules,
  columns,
  columnLabels,
  label,
}: {
  fields: Field[];
  validate: (values: Values) => Errors;
  onSubmit: (values: Values) => boolean;
  rules: Rule[];
  columns: string;
  columnLabels: string[];
  label: string;
}) => {
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Errors>({});
  const firstInputRef = useRef<HTMLInputElement>(null);
  const autocompleteId = useId();

  const submit = () => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some((messages) => messages.length > 0)) {
      return;
    }
    if (onSubmit(values)) {
      setValues({});
      setErrors({});
      firstInputRef.current?.focus();
    }
  };

  return (
    <>
      <Flex gap="2" align="center">
        {fields.map((field, index) => (
          <Flex key={field.name} grow css={{ minWidth: 0 }}>
            <InputErrorsTooltip
              errors={
                errors[field.name]?.length ? errors[field.name] : undefined
              }
              side="top"
            >
              {field.suggestions ? (
                <Combobox<string>
                  inputRef={index === 0 ? firstInputRef : undefined}
                  autoFocus={index === 0}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  color={errors[field.name]?.length ? "error" : undefined}
                  getItems={() => [...(field.suggestions ?? [])]}
                  itemToString={(item) => item ?? ""}
                  onItemSelect={(value) => {
                    setValues((current) => ({
                      ...current,
                      [field.name]: value ?? "",
                    }));
                    setErrors((current) => ({
                      ...current,
                      [field.name]: field.validateOnChange?.(value ?? "") ?? [],
                    }));
                  }}
                  onChange={(value) => {
                    if (value !== undefined) {
                      setValues((current) => ({
                        ...current,
                        [field.name]: value,
                      }));
                      setErrors((current) => ({
                        ...current,
                        [field.name]: field.validateOnChange?.(value) ?? [],
                      }));
                    }
                  }}
                />
              ) : (
                <InputField
                  placeholder={field.placeholder}
                  list={
                    field.autocomplete
                      ? `${autocompleteId}-${field.name}`
                      : undefined
                  }
                  type={field.type}
                  value={values[field.name] ?? ""}
                  color={errors[field.name]?.length ? "error" : undefined}
                  onChange={(event) => {
                    setValues((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }));
                    setErrors((current) => ({
                      ...current,
                      [field.name]:
                        field.validateOnChange?.(event.target.value) ?? [],
                    }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !field.autocomplete) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                />
              )}
            </InputErrorsTooltip>
            {field.autocomplete && (
              <datalist id={`${autocompleteId}-${field.name}`}>
                {(typeof field.autocomplete === "function"
                  ? field.autocomplete(values)
                  : field.autocomplete
                ).map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            )}
          </Flex>
        ))}
        <Button
          color="primary"
          disabled={Object.values(errors).some(
            (messages) => messages.length > 0
          )}
          onClick={submit}
          css={{ flexShrink: 0 }}
        >
          Add
        </Button>
      </Flex>
      {rules.length > 0 && (
        <ScrollArea>
          <Grid role="table" aria-label={label}>
            <Grid role="rowgroup">
              <Grid
                role="row"
                gap="2"
                css={{
                  gridTemplateColumns: `${columns} ${theme.spacing[9]}`,
                  p: theme.spacing[3],
                }}
              >
                {columnLabels.map((columnLabel) => (
                  <Text
                    key={columnLabel}
                    role="columnheader"
                    variant="regularBold"
                  >
                    {columnLabel}
                  </Text>
                ))}
                <Text role="columnheader" aria-label="Actions" />
              </Grid>
            </Grid>
            <List asChild>
              <Flex role="rowgroup" direction="column" gap="1" align="stretch">
                {rules.map(({ key, values, actions }, index) => (
                  <ListItem asChild key={key} index={index}>
                    <ProjectSettingsDataRow
                      role="row"
                      align="center"
                      gap="2"
                      css={{
                        gridTemplateColumns: `${columns} ${theme.spacing[9]}`,
                        "&:focus-visible": {
                          outline: `2px solid ${cssVar("--border-focus")}`,
                          outlineOffset: -2,
                        },
                      }}
                    >
                      {values.map((value, index) => (
                        <Flex key={index} role="cell" css={{ minWidth: 0 }}>
                          {value}
                        </Flex>
                      ))}
                      <Flex role="cell" align="center">
                        {actions}
                      </Flex>
                    </ProjectSettingsDataRow>
                  </ListItem>
                ))}
              </Flex>
            </List>
          </Grid>
        </ScrollArea>
      )}
    </>
  );
};
