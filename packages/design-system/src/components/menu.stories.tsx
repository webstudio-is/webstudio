// We demonstrate dropdown-menu/combobox/etc instead of menu.tsx,
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
  ComboboxLabel,
  ComboboxSeparator,
} from "./combobox";
import {
  Select,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
} from "./select";
import { TextField } from "./text-field";
import { Button } from "./button";
import {
  ChevronDownIcon,
  TrashIcon,
  MenuIcon,
  DotIcon,
} from "@webstudio-is/icons";
import { useState } from "react";
import { DeprecatedIconButton } from "./__DEPRECATED__/icon-button";
import { StorySection } from "./storybook";

const DropdownDemo = ({ withIndicator }: { withIndicator: boolean }) => {
  const [isApple, setIsApple] = useState(true);
  const [isOrange, setIsOrange] = useState(true);
  const [radioValue, setRadioValue] = useState("apple");

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button prefix={<MenuIcon />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent width="regular">
        <DropdownMenuLabel>Not choosable</DropdownMenuLabel>

        <DropdownMenuItem withIndicator={withIndicator}>
          Create
        </DropdownMenuItem>
        <DropdownMenuItem
          withIndicator={withIndicator}
          icon={withIndicator ? <TrashIcon /> : null}
          destructive
        >
          Delete
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
          <DropdownMenuSubContent width="regular">
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
            <DropdownMenuLabel>Choose many</DropdownMenuLabel>

            <DropdownMenuCheckboxItem
              checked={isApple}
              onSelect={() => setIsApple(isApple === false)}
            >
              Apple
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={isOrange}
              onSelect={() => setIsOrange(isOrange === false)}
            >
              Orange
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Choose one</DropdownMenuLabel>

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

type Fruit = "Apple" | "Banana" | "Orange" | "Peach";
const fruits: Fruit[] = ["Orange", "Apple", "Peach", "Banana"];

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

  const renderItem = (item: Fruit) => (
    <ComboboxListboxItem
      {...getItemProps({ item, index: items.indexOf(item) })}
      key={item}
      destructive={item === "Orange"}
      disabled={item === "Peach"}
      icon={item === "Apple" ? <DotIcon /> : undefined}
    >
      {item}
    </ComboboxListboxItem>
  );

  const roundItems = items.filter((item) => item !== "Banana");
  const longItems = items.filter((item) => item === "Banana");

  return (
    <ComboboxPopper>
      <div {...getComboboxProps()}>
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
            {roundItems.length > 0 && (
              <>
                <ComboboxLabel>Round</ComboboxLabel>
                {roundItems.map(renderItem)}
              </>
            )}
            {roundItems.length > 0 && longItems.length > 0 && (
              <ComboboxSeparator />
            )}
            {longItems.length > 0 && (
              <>
                <ComboboxLabel>Long</ComboboxLabel>
                {longItems.map(renderItem)}
              </>
            )}
          </ComboboxListbox>
        </ComboboxPopperContent>
      </div>
    </ComboboxPopper>
  );
};

const BasicSelectDemo = () => {
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

const ComplexSelectDemo = () => {
  const [value, setValue] = useState<Fruit>("Orange");
  return (
    <Select
      options={fruits}
      value={value}
      onChange={(value) => {
        setValue(value as Fruit);
      }}
    >
      <SelectGroup>
        <SelectLabel>Round</SelectLabel>
        <SelectItem destructive value="Orange" textValue="Orange">
          Orange (destructive)
        </SelectItem>
        <SelectItem icon={<DotIcon />} value="Apple" textValue="Apple">
          Apple (custom icon)
        </SelectItem>
        <SelectItem disabled value="Peach" textValue="Peach">
          Peach (disabled)
        </SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Long</SelectLabel>
        <SelectItem value="Banana" textValue="Banana">
          Banana
        </SelectItem>
      </SelectGroup>
    </Select>
  );
};

export const Demo = () => (
  <>
    <StorySection title="Dropdown menu">
      <div style={{ display: "flex", paddingBottom: 360 }}>
        <div style={{ paddingLeft: 100, paddingRight: 100 }}>
          <DropdownDemo withIndicator={true} />
        </div>
        <div style={{ paddingLeft: 100, paddingRight: 100 }}>
          <DropdownDemo withIndicator={false} />
        </div>
      </div>
    </StorySection>
    <StorySection title="Select menu (Combobox component)">
      <div style={{ width: 200 }}>
        <ComboboxDemo />
      </div>
    </StorySection>
    <StorySection title="Basic select menu (Select component)">
      <BasicSelectDemo />
    </StorySection>
    <StorySection title="Complex select menu (Select component)">
      <ComplexSelectDemo />
    </StorySection>
  </>
);

Demo.storyName = "Menu, Menu Item";

export default {
  title: "Library/Menu, Menu Item",
};
