import { useState } from "react";
import store from "immerhin";
import { Flex, List, ListItem, useList } from "@webstudio-is/design-system";
import { CheckIcon } from "@webstudio-is/icons";
import type { DesignToken } from "@webstudio-is/design-tokens";
import { designTokensGroups } from "@webstudio-is/design-tokens";
import { designTokensContainer, useDesignTokens } from "~/shared/nano-states";
import {
  removeByMutable,
  replaceByOrAppendMutable,
} from "~/shared/array-utils";
// @todo this is temporary, we need to either make that collapsible reusable or copy it over
// This wasn't properly designed, so this is mostly temp
import { CollapsibleSection } from "../inspector";
import { filterByType } from "./utils";
import { useMenu } from "./item-menu";
import { type DesignTokenSeed, TokenEditor } from "./token-editor";

const useLogic = () => {
  const [tokens] = useDesignTokens();
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
      store.createTransaction([designTokensContainer], (tokens) => {
        removeByMutable(tokens, (item) => item.name === name);
      });
    },
    onEdit: (index) => {
      setEditingToken(tokens[index]);
    },
  });

  const setToken = (name: undefined | string, token: DesignToken) => {
    store.createTransaction([designTokensContainer], (tokens) => {
      replaceByOrAppendMutable(tokens, token, (item) => item.name === name);
    });
  };

  return {
    isMenuOpen,
    getListProps,
    getItemProps,
    setToken,
    setEditingToken,
    editingToken,
    tokens,
    renderMenu,
  };
};

export const DesignTokensManager = () => {
  const {
    getListProps,
    getItemProps,
    setToken,
    setEditingToken,
    isMenuOpen,
    editingToken,
    tokens,
    renderMenu,
  } = useLogic();

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
          // Previously known token name in case token name has changed
          setToken(token?.name, updatedToken);
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
