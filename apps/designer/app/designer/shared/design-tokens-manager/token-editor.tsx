import { useState, useEffect, type FormEvent, useRef } from "react";
import { z } from "zod";
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
import { DesignToken } from "@webstudio-is/design-tokens";
import { useDesignTokens } from "~/shared/nano-states";
import { findByName } from "./utils";
import { theme } from "@webstudio-is/design-system";

const validate = (
  tokens: Array<DesignToken>,
  data: Partial<DesignToken>,
  token?: DesignToken
) => {
  const result = DesignToken.safeParse(data);
  const foundToken = findByName(tokens, data.name);
  const isRenaming =
    token !== undefined &&
    token.name !== data.name &&
    foundToken?.name !== data.name;

  if (foundToken && isRenaming === false) {
    const finalResult = result.success
      ? {
          error: new z.ZodError([]),
          success: false,
        }
      : result;

    finalResult.error.addIssue({
      code: "custom",
      message: "Name has to be unique",
      path: ["name"],
    });
    return finalResult;
  }

  return result;
};

const getToken = (
  form: HTMLFormElement,
  tokenOrSeed?: DesignToken | DesignTokenSeed
) => {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  return { ...tokenOrSeed, ...data } as DesignToken;
};

const getErrors = (
  field: string,
  validationResult?: ReturnType<typeof validate>
) => {
  if (validationResult === undefined || validationResult.success) {
    return [];
  }
  return validationResult.error?.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
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
  const [validationResult, setValidationResult] = useState<
    ReturnType<typeof validate> | undefined
  >();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen === false && validationResult?.success === false) {
      setValidationResult(undefined);
    }
  }, [isOpen, validationResult?.success]);

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    if (token === undefined || formRef.current === null) {
      return;
    }
    const updatedToken = getToken(formRef.current, token ?? seed);
    const nextValidationResult = validate(tokens, updatedToken, token);
    setValidationResult(nextValidationResult);
  };

  const submit = (ignoreErrors = false) => {
    if (formRef.current === null) {
      return;
    }
    const updatedToken = getToken(formRef.current, token ?? seed);
    const nextValidationResult = validate(tokens, updatedToken, token);
    setValidationResult(nextValidationResult);

    if (nextValidationResult.success) {
      onChangeComplete(updatedToken);
      onOpenChange(false);
      return;
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
            variant="ghost"
            onClick={(event) => {
              event.preventDefault();
              onOpenChange(true);
            }}
            prefix={<PlusIcon />}
          />
        )}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent align="end" css={{ zIndex: theme.zIndices[1] }}>
          <form onChange={handleChange} onSubmit={handleSubmit} ref={formRef}>
            <Flex
              direction="column"
              gap="2"
              css={{ padding: theme.spacing[7] }}
            >
              <Label htmlFor="name">Name</Label>
              <InputErrorsTooltip
                errors={getErrors("name", validationResult)}
                css={{ zIndex: theme.zIndices[2] }}
              >
                <TextField id="name" name="name" defaultValue={token?.name} />
              </InputErrorsTooltip>
              <Label htmlFor="value">Value</Label>
              <InputErrorsTooltip
                errors={getErrors("value", validationResult)}
                css={{ zIndex: theme.zIndices[2] }}
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
              {token === undefined && <Button type="submit">Create</Button>}
            </Flex>
          </form>
          <PopoverHeader title={token?.name ?? "New Token"} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
