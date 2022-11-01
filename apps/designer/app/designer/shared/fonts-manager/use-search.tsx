import { ChangeEventHandler, KeyboardEventHandler, useState } from "react";

type UseSearch = {
  onCancel: () => void;
  onSearch: (search: string) => void;
  onSelect: (direction: "next" | "previous" | "current") => void;
};

export const useSearch = ({ onCancel, onSearch, onSelect }: UseSearch) => {
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

  return () => {
    return {
      value: search,
      onCancel,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
    };
  };
};
