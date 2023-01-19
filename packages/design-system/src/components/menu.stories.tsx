// We're demoing dropdown-menu/combobox/etc instead of menu.tsx here,
// because what menu.tsx exports is not intended to be used directly

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuArrow,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./dropdown-menu";
import {
  useCombobox,
  ComboboxPopper,
  ComboboxPopperContent,
  ComboboxPopperAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
} from "./combobox";
import { Select } from "./select";
import { TextField } from "./text-field";
import { Button } from "./button";
import { ChevronDownIcon, MenuIcon } from "@webstudio-is/icons";
import { useState } from "react";
import { DeprecatedIconButton } from "./__DEPRECATED__/icon-button";

const DropdownDemo = ({ withIndicator }: { withIndicator: boolean }) => {
  const [isTogglableChecked, setIsTogglableChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("apple");

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button prefix={<MenuIcon />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Basic</DropdownMenuLabel>

        <DropdownMenuItem withIndicator={withIndicator}>
          Regular
        </DropdownMenuItem>
        <DropdownMenuItem withIndicator={withIndicator} destructive>
          Destructive
        </DropdownMenuItem>
        <DropdownMenuItem withIndicator={withIndicator} disabled>
          Disabled
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Sub-menu</DropdownMenuLabel>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger withIndicator={withIndicator}>
            Open sub-menu
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem withIndicator={withIndicator}>
              Regular
            </DropdownMenuItem>
            <DropdownMenuItem withIndicator={withIndicator} destructive>
              Destructive
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {withIndicator && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Checkbox</DropdownMenuLabel>

            <DropdownMenuCheckboxItem
              checked={isTogglableChecked}
              onSelect={() =>
                setIsTogglableChecked(isTogglableChecked === false)
              }
            >
              Togglable
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Radio (choose one)</DropdownMenuLabel>

            <DropdownMenuRadioGroup
              value={radioValue}
              onValueChange={setRadioValue}
            >
              <DropdownMenuRadioItem value="apple">Apple</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="orange">
                Orange
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}

        <DropdownMenuArrow />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type Fruit = "Apple" | "Banana" | "Orange";
const fruits: Fruit[] = ["Apple", "Banana", "Orange"];

const ComboboxDemo = () => {
  const [selectedItem, onItemSelect] = useState<Fruit>();

  const {
    items,
    getInputProps,
    getComboboxProps,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
  } = useCombobox<Fruit>({
    items: fruits,
    itemToString: (item) => item ?? "",
    value: null,
    selectedItem,
    onItemSelect,
  });

  const renderItem = (item: Fruit, index: number) => (
    <ComboboxListboxItem {...getItemProps({ item, index })} key={index}>
      {item}
    </ComboboxListboxItem>
  );

  return (
    <ComboboxPopper>
      <div data-test {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...getInputProps()}
            placeholder="Enter: Apple"
            suffix={
              <DeprecatedIconButton {...getToggleButtonProps()}>
                <ChevronDownIcon />
              </DeprecatedIconButton>
            }
          />
        </ComboboxPopperAnchor>
        <ComboboxPopperContent align="end" sideOffset={5}>
          <ComboboxListbox {...getMenuProps()}>
            {items.map(renderItem)}
          </ComboboxListbox>
        </ComboboxPopperContent>
      </div>
    </ComboboxPopper>
  );
};

const SelectDemo = () => {
  const [value, setValue] = useState<Fruit>("Apple");
  return (
    <Select
      options={fruits}
      value={value}
      onChange={(value) => {
        setValue(value as Fruit);
      }}
    />
  );
};

export const Menu = () => (
  <>
    <Section title="Dropdown menu">
      <div style={{ display: "flex", paddingBottom: 360 }}>
        <div style={{ paddingLeft: 100, paddingRight: 100 }}>
          <DropdownDemo withIndicator={true} />
        </div>
        <div style={{ paddingLeft: 100, paddingRight: 100 }}>
          <DropdownDemo withIndicator={false} />
        </div>
      </div>
    </Section>
    <Section title="Select menu (<Combobox>)">
      <ComboboxDemo />
    </Section>
    <Section title="Select menu (<Select>)">
      <SelectDemo />
    </Section>
  </>
);

export default {
  title: "Library/Menu",
  component: Menu,
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <>
    <h3 style={{ fontFamily: "sans-serif" }}>{title}</h3>
    <div style={{ display: "flex", gap: 12 }}>{children}</div>
  </>
);
