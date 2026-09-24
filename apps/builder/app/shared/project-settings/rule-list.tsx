import { useRef, useState, type ReactNode } from "react";
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
} from "@webstudio-is/design-system";
import { ProjectSettingsDataRow } from "./data-row";

type Values = Record<string, string>;
type Errors = Record<string, string[]>;

type Field = {
  name: string;
  placeholder: string;
  type?: "text" | "password";
  suggestions?: string[];
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
}: {
  fields: Field[];
  validate: (values: Values) => Errors;
  onSubmit: (values: Values) => boolean;
  rules: Rule[];
  columns: string;
}) => {
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Errors>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

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
                  getItems={() => field.suggestions ?? []}
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
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submit();
                    }
                  }}
                />
              )}
            </InputErrorsTooltip>
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
          <Grid>
            <List asChild>
              <Flex direction="column" gap="1" align="stretch">
                {rules.map(({ key, values, actions }) => (
                  <ListItem asChild key={key}>
                    <ProjectSettingsDataRow
                      align="center"
                      gap="2"
                      css={{ gridTemplateColumns: columns }}
                    >
                      {values.map((value, index) => (
                        <Flex key={index} css={{ minWidth: 0 }}>
                          {value}
                        </Flex>
                      ))}
                      {actions}
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
