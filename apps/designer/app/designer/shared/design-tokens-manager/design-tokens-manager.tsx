import {
  useState,
  useEffect,
  type FormEvent,
  type ComponentProps,
} from "react";
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
import type { DesignToken } from "@webstudio-is/project";
import { designTokensGroups } from "@webstudio-is/project";
import { useDesignTokens } from "~/shared/nano-states";
import type { Publish } from "~/shared/pubsub";
// @todo this is temporary, we need to either make that collapsible reusable or copy it over
// This wasn't properly designed, so this is mostly temp
import { CollapsibleSection } from "../inspector";
import { deleteTokenMutable, filterByType, findByName } from "./utils";
import { useMenu } from "./item-menu";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    updateToken: DesignToken;
    deleteToken: DesignToken["name"];
  }
}

const validate = (
  tokens: Array<DesignToken>,
  data: Partial<DesignToken>
): { name: Array<string>; value: Array<string>; hasErrors: boolean } => {
  const name = [];
  const value = [];

  if (String(data.name).trim() === "") name.push("Name is required");
  if (findByName(tokens, data?.name)) name.push("Name is already taken");
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

const getData = (event: FormEvent<HTMLFormElement>) => {
  const formData = new FormData(event.currentTarget);
  return Object.fromEntries(formData);
};

const TokenEditor = ({
  token,
  trigger,
  isOpen,
  onChangeComplete,
  onOpenChange,
}: {
  token: DesignToken;
  trigger?: JSX.Element;
  isOpen: boolean;
  onChangeComplete: (token: DesignToken) => void;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const [tokens] = useDesignTokens();
  const [errors, setErrors] =
    useState<ReturnType<typeof validate>>(initialErrors);
  const isNew = name === undefined;

  useEffect(() => {
    if (isOpen === false && errors.hasErrors) {
      setErrors(initialErrors);
    }
  }, [isOpen, errors.hasErrors]);

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    if (errors.hasErrors === false) return;
    const data = getData(event);
    const nextErrors = validate(tokens, data);
    setErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = getData(event);
    const nextErrors = validate(tokens, data);
    setErrors(nextErrors);

    if (nextErrors.hasErrors === false) {
      onChangeComplete({ ...token, ...data } as DesignToken);
      onOpenChange(false);
    }
  };

  return (
    <Popover modal open={isOpen} onOpenChange={onOpenChange}>
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
          <form onChange={handleChange} onSubmit={handleSubmit}>
            <Flex direction="column" gap="2" css={{ padding: "$spacing$7" }}>
              <Label htmlFor="name">Name</Label>
              <InputErrorsTooltip
                errors={errors.name}
                css={{ zIndex: "$zIndices$2" }}
              >
                <TextField id="name" name="name" />
              </InputErrorsTooltip>
              <Label htmlFor="value">Value</Label>
              <InputErrorsTooltip
                errors={errors.value}
                css={{ zIndex: "$zIndices$2" }}
              >
                <TextField id="value" name="value" />
              </InputErrorsTooltip>
              <Label htmlFor="description">Description</Label>
              <TextArea id="description" name="description" />
              {isNew && (
                <Button type="submit" variant="blue">
                  Create
                </Button>
              )}
            </Flex>
          </form>
          <PopoverHeader title={isNew ? "New Token" : name} />
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
    DesignToken["name"] | undefined
  >();

  const { render: renderMenu, isOpen: isMenuOpen } = useMenu({
    selectedIndex,
    onSelect: setSelectedIndex,
    onDelete: () => {
      const { name } = tokens[index];
      publish({ type: "deleteToken", payload: name });
      deleteTokenMutable([...tokens], name);
    },
    onEdit: (index) => {
      setEditingToken(tokens[index].name);
    },
  });
  const listProps = getListProps();

  const renderTokenEditor = (
    props: Omit<ComponentProps<typeof TokenEditor>, "token"> & {
      token: Partial<DesignToken>;
    }
  ) => {
    return (
      <TokenEditor
        {...props}
        onChangeComplete={(token) => {
          publish({ type: "updateToken", payload: token });
          // @todo update token when its an existing one
          setTokens([...tokens, token]);
        }}
        onOpenChange={(isOpen) => {
          if (isOpen === false) {
            return setEditingToken(undefined);
          }
          console.log(2222, props.token.name || props.token.type);
          setEditingToken(props.token.name || props.token.type);
        }}
      />
    );
  };

  let index = -1;

  return (
    <List
      {...listProps}
      onBlur={(event) => {
        if (isMenuOpen === false) {
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
              isOpen: editingToken === type,
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
                      isOpen: editingToken === token.name,
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
