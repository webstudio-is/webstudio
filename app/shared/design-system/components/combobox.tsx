import { type ComponentProps, useState } from "react";
import { TextField } from "./text-field";
import { Menu, MenuAnchor } from "./menu";

type ComboboxProps = ComponentProps<typeof TextField> & {
  items: Array<Item>;
  onValueSelect: (value: string) => void;
  onValueEnter: (value: string) => void;
  onItemEnter: (value: string) => void;
  onItemLeave: (value: string) => void;
  value: string;
};

export const Combobox = ({
  items,
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

  // @todo: this has a selection preservation and or double entry bug
  // useEffect(() => {
  //   setCurrentValue(value);
  // }, [value]);

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
        />
      </MenuAnchor>
    </Menu>
  );
};
