import { useState, useEffect, type FormEvent, useRef } from "react";
import {
  Button,
  Flex,
  InputErrorsTooltip,
  Label,
  List,
  ListItem,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
  PopoverTrigger,
  TextArea,
  TextField,
  useList,
} from "@webstudio-is/design-system";
import { CheckIcon, PlusIcon } from "@webstudio-is/icons";
import type { DesignToken } from "@webstudio-is/design-tokens";
import { designTokensGroups } from "@webstudio-is/design-tokens";
import { useDesignTokens } from "~/shared/nano-states";
import type { Publish } from "~/shared/pubsub";
// @todo this is temporary, we need to either make that collapsible reusable or copy it over
// This wasn't properly designed, so this is mostly temp
import { CollapsibleSection } from "../inspector";
import {
  deleteTokenMutable,
  filterByType,
  findByName,
  updateTokenMutable,
} from "./utils";
import { useMenu } from "./item-menu";
import produce from "immer";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateToken: {
      // Previously known token name in case token name has changed
      name: DesignToken["name"];
      token: DesignToken;
    };
    createToken: DesignToken;
    deleteToken: DesignToken["name"];
  }
}

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

const getData = (form: HTMLFormElement) => {
  const formData = new FormData(form);
  return Object.fromEntries(formData);
};

type DesignTokenSeed = Pick<DesignToken, "group" | "type">;

const TokenEditor = ({
  token,
  trigger,
  isOpen,
  onChangeComplete,
  onOpenChange,
}: {
  token: DesignToken | DesignTokenSeed;
  trigger?: JSX.Element;
  isOpen: boolean;
  onChangeComplete: (token: DesignToken) => void;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const [tokens] = useDesignTokens();
  const [errors, setErrors] =
    useState<ReturnType<typeof validate>>(initialErrors);
  const isNew = "name" in token === false;
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
    const data = getData(formRef.current);
    const nextErrors = validate(tokens, data, isNew);
    setErrors(nextErrors);
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (formRef.current === null) return;
    const data = getData(formRef.current);
    const nextErrors = validate(tokens, data, isNew);
    setErrors(nextErrors);

    if (nextErrors.hasErrors === false) {
      onChangeComplete({ ...token, ...data } as DesignToken);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      handleSubmit();
      return;
    }
    onOpenChange(isOpen);
  };

  return (
    <Popover modal open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        asChild
        aria-label={isNew ? "Create Token" : "Edit Token"}
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
                <TextField
                  id="name"
                  name="name"
                  defaultValue={"name" in token ? token.name : ""}
                />
              </InputErrorsTooltip>
              <Label htmlFor="value">Value</Label>
              <InputErrorsTooltip
                errors={errors.value}
                css={{ zIndex: "$zIndices$2" }}
              >
                <TextField
                  id="value"
                  name="value"
                  defaultValue={"value" in token ? token.value : ""}
                />
              </InputErrorsTooltip>
              <Label htmlFor="description">Description</Label>
              <TextArea
                id="description"
                name="description"
                defaultValue={"description" in token ? token.description : ""}
              />
              {isNew && (
                <Button type="submit" variant="blue">
                  Create
                </Button>
              )}
            </Flex>
          </form>
          <PopoverHeader title={"name" in token ? token.name : "New Token"} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const DesignTokensManager = ({ publish }: { publish: Publish }) => {
  const [tokens, setTokens] = useDesignTokens();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const { getItemProps, getListProps } = useList({
    items: tokens,
    selectedIndex,
    currentIndex,
    onSelect: setSelectedIndex,
    onChangeCurrent: setCurrentIndex,
  });
  const [editingToken, setEditingToken] = useState<
    Partial<DesignToken> | undefined
  >();
  const { render: renderMenu, isOpen: isMenuOpen } = useMenu({
    selectedIndex,
    onSelect: setSelectedIndex,
    onDelete: () => {
      const { name } = tokens[selectedIndex];
      publish({ type: "deleteToken", payload: name });
      const updatedTokens = [...tokens];
      deleteTokenMutable(updatedTokens, name);
      setTokens(updatedTokens);
    },
    onEdit: (index) => {
      setEditingToken(tokens[index]);
    },
  });
  const listProps = getListProps();

  const renderTokenEditor = ({
    token,
    isOpen,
    trigger,
  }: {
    token: DesignToken | DesignTokenSeed;
    isOpen: boolean;
    trigger?: JSX.Element;
  }) => {
    return (
      <TokenEditor
        token={token}
        isOpen={isOpen}
        trigger={trigger}
        onChangeComplete={(token) => {
          const foundToken = findByName(tokens, token.name);
          const previousTokenName = token.name;
          const isNew =
            foundToken === undefined || previousTokenName === undefined;

          if (isNew) {
            publish({ type: "createToken", payload: token });
            setTokens([...tokens, token]);
            return;
          }

          const updatedToken = { ...foundToken, ...token };

          publish({
            type: "updateToken",
            payload: { name: previousTokenName, token: updatedToken },
          });
          const updatedTokens = produce(tokens, (draft) => {
            updateTokenMutable(draft, token, previousTokenName);
          });
          setTokens(updatedTokens);
        }}
        onOpenChange={(isOpen) => {
          if (isOpen === false) {
            return setEditingToken(undefined);
          }
          setEditingToken(token);
        }}
      />
    );
  };

  let index = -1;

  return (
    <List
      {...listProps}
      css={{ overflow: "auto" }}
      onBlur={(event) => {
        if (isMenuOpen === false && editingToken === undefined) {
          listProps.onBlur(event);
        }
      }}
    >
      {designTokensGroups.map(({ group, type }) => {
        return (
          <CollapsibleSection
            label={group}
            key={group}
            rightSlot={renderTokenEditor({
              token: { group, type },
              isOpen:
                editingToken?.name === undefined && editingToken?.type === type,
            })}
          >
            <Flex direction="column">
              {filterByType(tokens, type).map((token) => {
                const itemProps = getItemProps({ index: ++index });
                const listItem = (
                  <ListItem
                    {...itemProps}
                    key={token.name}
                    prefix={itemProps.current ? <CheckIcon /> : undefined}
                    suffix={renderMenu(index)}
                  >
                    {renderTokenEditor({
                      token,
                      trigger: (
                        <div
                          onClick={(event) => {
                            event.preventDefault();
                          }}
                        >
                          {token.name}
                        </div>
                      ),
                      isOpen: editingToken?.name === token.name,
                    })}
                  </ListItem>
                );
                return listItem;
              })}
            </Flex>
          </CollapsibleSection>
        );
      })}
    </List>
  );
};
