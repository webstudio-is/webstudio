import { useRef, useState, type ReactNode } from "react";
import {
  Button,
  Combobox,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  InsetList,
  InsetListItem,
  List,
  ListItem,
  PanelContent,
  ScrollArea,
  SmallIconButton,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { TrashIcon } from "@webstudio-is/icons";
import { ProjectSettingsDataRow } from "./data-row";

type Values = Record<string, string>;
type Errors = Record<string, string[]>;

type Field = {
  name: string;
  placeholder: string;
  type?: "text" | "password";
  suggestions?: readonly string[] | ((values: Values) => readonly string[]);
  validateOnChange?: (value: string) => string[];
};

type Rule = {
  key: string;
  values: ReactNode[];
  actions?: ReactNode;
};

export const ProjectSettingsDeleteRuleButton = ({
  label,
  description,
  onDelete,
}: {
  label: string;
  description: string;
  onDelete: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <SmallIconButton
        ref={buttonRef}
        variant="destructive"
        icon={<TrashIcon />}
        aria-label={label}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            if (buttonRef.current?.isConnected) {
              event.preventDefault();
              buttonRef.current.focus();
            }
          }}
        >
          <DialogTitle>Delete rule</DialogTitle>
          <DialogDescription asChild>
            <PanelContent as={Flex}>
              <Text>
                Are you sure you want to delete {description}? This action
                cannot be undone.
              </Text>
            </PanelContent>
          </DialogDescription>
          <DialogActions>
            <Button
              color="destructive"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
            >
              Delete
            </Button>
            <DialogClose>
              <Button color="ghost" autoFocus>
                Cancel
              </Button>
            </DialogClose>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
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
  const [formRevision, setFormRevision] = useState(0);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some((messages) => messages.length > 0)) {
      setFormRevision((current) => current + 1);
      return;
    }
    if (onSubmit(values)) {
      setValues({});
      setErrors({});
      firstInputRef.current?.focus();
    } else {
      // Downshift clears an unselected free-form value on blur. Remount the
      // comboboxes after a failed save to restore the values kept in state.
      setFormRevision((current) => current + 1);
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
                  key={formRevision}
                  modal={false}
                  inputRef={index === 0 ? firstInputRef : undefined}
                  autoFocus={index === 0}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  color={errors[field.name]?.length ? "error" : undefined}
                  getItems={() => [
                    ...(typeof field.suggestions === "function"
                      ? field.suggestions(values)
                      : field.suggestions ?? []),
                  ]}
                  itemToString={(item) => item ?? ""}
                  onItemSelect={(value) => {
                    setValues((current) => ({
                      ...current,
                      [field.name]: value ?? "",
                    }));
                    setFormRevision((current) => current + 1);
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
              <InsetList role="rowgroup">
                {rules.map(({ key, values, actions }, index) => (
                  <ListItem asChild key={key} index={index}>
                    <InsetListItem asChild>
                      <ProjectSettingsDataRow
                        role="row"
                        align="center"
                        gap="2"
                        css={{
                          gridTemplateColumns: `${columns} ${theme.spacing[9]}`,
                        }}
                      >
                        {values.map((value, index) => (
                          <Flex key={index} role="cell" css={{ minWidth: 0 }}>
                            {value}
                          </Flex>
                        ))}
                        <Flex
                          role="cell"
                          align="center"
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          {actions}
                        </Flex>
                      </ProjectSettingsDataRow>
                    </InsetListItem>
                  </ListItem>
                ))}
              </InsetList>
            </List>
          </Grid>
        </ScrollArea>
      )}
    </>
  );
};
