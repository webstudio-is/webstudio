import { type ComponentProps, useState, useEffect } from "react";
import { ChevronDownIcon } from "~/shared/icons";
import { TextField } from "./text-field";
import { IconButton } from "./icon-button";
import { MenuAnchor, Menu, MenuContent, MenuItem } from "./menu";

type Option = { label: string };

type ComboboxProps = ComponentProps<typeof TextField> & {
  options: Array<Option>;
  onValueSelect: (value: Option) => void;
  onValueEnter: (value: Option) => void;
  onItemEnter: (value: Option) => void;
  onItemLeave: (value: Option) => void;
  value: Option;
};

export const Combobox = ({
  options,
  onValueSelect,
  onValueEnter,
  onItemEnter,
  onItemLeave,
  value,
  css,
  ...rest
}: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  return (
    <Menu open={isOpen} modal={true} onOpenChange={setIsOpen}>
      <MenuAnchor asChild>
        <TextField
          {...rest}
          value={currentValue}
          autoComplete="off"
          // @todo avoid hardcoding padding
          css={{ ...css, paddingRight: 30 }}
          onChange={(event) => {
            setCurrentValue(event.target.value);
          }}
          onKeyDown={(event) => {
            switch (event.key) {
              case "ArrowDown":
              case "ArrowUp": {
                setIsOpen(true);
                break;
              }
              case "Enter": {
                onValueEnter(event.currentTarget.value);
                break;
              }
            }
          }}
        />
      </MenuAnchor>
      <IconButton
        variant="ghost"
        size="1"
        // @todo avoid hardcoding margin
        css={{ marginLeft: -32 }}
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <ChevronDownIcon />
      </IconButton>
      <MenuContent loop portalled asChild>
        <div>
          {options.map(({ label }, index) => {
            return (
              <MenuItem
                key={index}
                onMouseEnter={() => {
                  onItemEnter(label);
                }}
                onFocus={() => {
                  onItemEnter(label);
                }}
                onSelect={() => {
                  onValueSelect(label);
                }}
              >
                {label}
              </MenuItem>
            );
          })}
        </div>
      </MenuContent>
    </Menu>
  );
};
