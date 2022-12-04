import { useState, useEffect, type FormEvent, useRef } from "react";
import {
  Button,
  Flex,
  InputErrorsTooltip,
  Label,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
  PopoverTrigger,
  TextArea,
  TextField,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import type { DesignToken } from "@webstudio-is/design-tokens";
import { useDesignTokens } from "~/shared/nano-states";
import { findByName } from "./utils";

const validate = (
  tokens: Array<DesignToken>,
  data: Partial<DesignToken>,
  isNew: boolean
): { name: Array<string>; value: Array<string>; hasErrors: boolean } => {
  const name = [];
  const value = [];

  if (String(data.name).trim() === "") name.push("Name is required");
  if (isNew && findByName(tokens, data?.name)) {
    name.push("Name is already taken");
  }
  if (String(data.value).trim() === "") value.push("Value is required");

  return {
    name,
    value,
    hasErrors: name.length !== 0 || value.length !== 0,
  };
};

const initialErrors = {
  name: [],
  value: [],
  hasErrors: false,
};

const getToken = (
  form: HTMLFormElement,
  tokenOrSeed?: DesignToken | DesignTokenSeed
) => {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  return { ...tokenOrSeed, ...data } as DesignToken;
};

export type DesignTokenSeed = Pick<DesignToken, "group" | "type">;

export const TokenEditor = ({
  token,
  seed,
  trigger,
  isOpen,
  onChangeComplete,
  onOpenChange,
}: {
  token?: DesignToken;
  seed?: DesignTokenSeed;
  trigger?: JSX.Element;
  isOpen: boolean;
  onChangeComplete: (token: DesignToken) => void;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const [tokens] = useDesignTokens();
  const [errors, setErrors] =
    useState<ReturnType<typeof validate>>(initialErrors);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen === false && errors.hasErrors) {
      setErrors(initialErrors);
    }
  }, [isOpen, errors.hasErrors]);

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    if (errors.hasErrors === false || formRef.current === null) {
      return;
    }
    const updatedToken = getToken(formRef.current, token ?? seed);
    const nextErrors = validate(tokens, updatedToken, token === undefined);
    setErrors(nextErrors);
  };

  const submit = (ignoreErrors: boolean = false) => {
    if (formRef.current === null) return;
    const updatedToken = getToken(formRef.current, token ?? seed);
    const nextErrors = validate(tokens, updatedToken, token === undefined);
    setErrors(nextErrors);

    if (nextErrors.hasErrors === false) {
      onChangeComplete(updatedToken);
    }

    if (ignoreErrors) {
      onOpenChange(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      submit(true);
      return;
    }
    onOpenChange(isOpen);
  };

  return (
    <Popover modal open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        asChild
        aria-label={token === undefined ? "Create Token" : "Edit Token"}
      >
        {trigger ?? (
          <Button
            ghost
            onClick={(event) => {
              event.preventDefault();
              onOpenChange(true);
            }}
          >
            <PlusIcon />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent align="end" css={{ zIndex: "$zIndices$1" }}>
          <form onChange={handleChange} onSubmit={handleSubmit} ref={formRef}>
            <Flex direction="column" gap="2" css={{ padding: "$spacing$7" }}>
              <Label htmlFor="name">Name</Label>
              <InputErrorsTooltip
                errors={errors.name}
                css={{ zIndex: "$zIndices$2" }}
              >
                <TextField id="name" name="name" defaultValue={token?.name} />
              </InputErrorsTooltip>
              <Label htmlFor="value">Value</Label>
              <InputErrorsTooltip
                errors={errors.value}
                css={{ zIndex: "$zIndices$2" }}
              >
                <TextField
                  id="value"
                  name="value"
                  defaultValue={token?.value}
                />
              </InputErrorsTooltip>
              <Label htmlFor="description">Description</Label>
              <TextArea
                id="description"
                name="description"
                defaultValue={token?.description}
              />
              {token === undefined && (
                <Button type="submit" variant="blue">
                  Create
                </Button>
              )}
            </Flex>
          </form>
          <PopoverHeader title={token?.name ?? "New Token"} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
