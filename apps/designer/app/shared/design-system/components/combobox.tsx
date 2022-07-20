import { type ComponentProps, useState, useEffect } from "react";
import { ChevronDownIcon } from "~/shared/icons";
import { TextField } from "./text-field";
import { IconButton } from "./icon-button";
import { MenuAnchor, Menu, MenuContent, MenuItem } from "./menu";

type BaseOption = { label: string };

const getTextValue = <Option extends BaseOption>(option?: Option) => {
  return option ? option.label : "";
};

type DisclosureProps = ComponentProps<typeof TextField>;

type ComboboxProps<Option> = {
  name: string;
  options: ReadonlyArray<Option>;
  value?: Option;
  onOptionSelect?: (value: Option) => void;
  onOptionHighlight?: (value?: Option) => void;
  disclosure?: (props: DisclosureProps) => JSX.Element;
};

export const Combobox = <Option extends BaseOption>({
  options,
  value,
  name,
  onOptionSelect,
  onOptionHighlight,
  disclosure = (props) => <TextField {...props} />,
}: ComboboxProps<Option>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [textValue, setTextValue] = useState(getTextValue<Option>(value));

  useEffect(() => {
    setTextValue(getTextValue<Option>(value));
  }, [value]);

  return (
    <Menu open={isOpen} modal={true} onOpenChange={setIsOpen}>
      <MenuAnchor asChild>
        {disclosure({
          name,
          autoComplete: "off",
          value: textValue,
          onChange: (event) => {
            setTextValue(event.target.value);
          },
          onKeyDown: (event) => {
            switch (event.key) {
              case "ArrowDown":
              case "ArrowUp": {
                setIsOpen(true);
                break;
              }
              case "Enter": {
                break;
              }
            }
          },
        })}
        <IconButton variant="ghost" size="1">
          <ChevronDownIcon />
        </IconButton>
      </MenuAnchor>
      <MenuContent loop portalled asChild>
        <div>
          {options.map((option, index) => {
            return (
              <MenuItem
                key={index}
                onMouseEnter={() => {
                  // onOptionHighlight(option);
                }}
                onFocus={() => {
                  // onOptionHighlight(option);
                }}
                onSelect={() => {
                  //onOptionSelect(option);
                }}
              >
                {getTextValue<Option>(option)}
              </MenuItem>
            );
          })}
        </div>
      </MenuContent>
    </Menu>
  );
};
