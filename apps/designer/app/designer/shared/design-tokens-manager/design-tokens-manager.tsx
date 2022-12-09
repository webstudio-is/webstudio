import { useState } from "react";
import { Flex, List, ListItem, useList } from "@webstudio-is/design-system";
import { CheckIcon } from "@webstudio-is/icons";
import type { DesignToken } from "@webstudio-is/design-tokens";
import { designTokensGroups } from "@webstudio-is/design-tokens";
import { useDesignTokens } from "~/shared/nano-states";
import type { Publish } from "~/shared/pubsub";
// @todo this is temporary, we need to either make that collapsible reusable or copy it over
// This wasn't properly designed, so this is mostly temp
import { CollapsibleSection } from "../inspector";
import { deleteTokenMutable, filterByType, updateTokenMutable } from "./utils";
import { useMenu } from "./item-menu";
import produce from "immer";
import { type DesignTokenSeed, TokenEditor } from "./token-editor";

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

const useLogic = ({ publish }: { publish: Publish }) => {
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
      const updatedTokens = produce(tokens, (draft) => {
        deleteTokenMutable(draft, name);
      });
      setTokens(updatedTokens);
    },
    onEdit: (index) => {
      setEditingToken(tokens[index]);
    },
  });

  const createToken = (token: DesignToken) => {
    publish({ type: "createToken", payload: token });
    setTokens([...tokens, token]);
  };

  const updateToken = (previousToken: DesignToken, nextToken: DesignToken) => {
    publish({
      type: "updateToken",
      payload: { name: previousToken.name, token: nextToken },
    });
    const updatedTokens = produce(tokens, (draft) => {
      updateTokenMutable(draft, nextToken, previousToken.name);
    });
    setTokens(updatedTokens);
  };

  return {
    isMenuOpen,
    getListProps,
    getItemProps,
    createToken,
    updateToken,
    setEditingToken,
    editingToken,
    tokens,
    renderMenu,
  };
};

export const DesignTokensManager = ({ publish }: { publish: Publish }) => {
  const {
    getListProps,
    getItemProps,
    createToken,
    updateToken,
    setEditingToken,
    isMenuOpen,
    editingToken,
    tokens,
    renderMenu,
  } = useLogic({ publish });

  const renderEditor = ({
    token,
    seed,
    isOpen,
    trigger,
  }: {
    token?: DesignToken;
    seed?: DesignTokenSeed;
    isOpen: boolean;
    trigger?: JSX.Element;
  }) => {
    return (
      <TokenEditor
        seed={seed}
        token={token}
        isOpen={isOpen}
        trigger={trigger}
        onChangeComplete={(updatedToken) => {
          if (token === undefined) {
            return createToken(updatedToken);
          }

          updateToken(token, updatedToken);
        }}
        onOpenChange={(isOpen) => {
          if (isOpen === false) {
            return setEditingToken(undefined);
          }
          setEditingToken(token ?? seed);
        }}
      />
    );
  };

  let index = -1;
  const listProps = getListProps();

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
            rightSlot={renderEditor({
              seed: { group, type },
              isOpen:
                editingToken?.name === undefined && editingToken?.type === type,
            })}
          >
            <Flex direction="column">
              {filterByType(tokens, type).map((token) => {
                const itemProps = getItemProps({ index: ++index });
                return (
                  <ListItem
                    {...itemProps}
                    key={token.name}
                    prefix={itemProps.current ? <CheckIcon /> : undefined}
                    suffix={renderMenu(index)}
                  >
                    {renderEditor({
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
              })}
            </Flex>
          </CollapsibleSection>
        );
      })}
    </List>
  );
};
