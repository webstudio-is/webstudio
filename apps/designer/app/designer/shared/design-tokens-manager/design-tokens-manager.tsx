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

  const renderTokenEditor = ({
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
            publish({ type: "createToken", payload: updatedToken });
            setTokens([...tokens, updatedToken]);
            return;
          }

          publish({
            type: "updateToken",
            payload: { name: token.name, token: updatedToken },
          });
          const updatedTokens = produce(tokens, (draft) => {
            updateTokenMutable(draft, updatedToken, token.name);
          });
          setTokens(updatedTokens);
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
            rightSlot={renderTokenEditor({
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
              })}
            </Flex>
          </CollapsibleSection>
        );
      })}
    </List>
  );
};
