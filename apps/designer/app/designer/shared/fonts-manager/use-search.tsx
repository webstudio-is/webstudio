import { ChangeEventHandler, KeyboardEventHandler, useState } from "react";

type UseSearch = {
  onCancel: () => void;
  onSearch: (search: string) => void;
  onSelect: (direction: "next" | "previous" | "current") => void;
};

export const useSearch = ({ onSearch, onSelect, onCancel }: UseSearch) => {
  const [search, setSearch] = useState("");
  const handleKeyDown: KeyboardEventHandler = ({ code }) => {
    const keyMap = {
      ArrowUp: "previous",
      ArrowDown: "next",
      Enter: "current",
    } as const;
    const direction = keyMap[code as keyof typeof keyMap];
    if (direction !== undefined) onSelect(direction);
  };

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const { value } = event.currentTarget;
    setSearch(value);
    onSearch(value);
  };

  const handleCancel = () => {
    setSearch("");
    onCancel();
  };

  return {
    value: search,
    onCancel: handleCancel,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
  };
};
