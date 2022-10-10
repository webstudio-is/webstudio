import { useRef, useState } from "react";
import { IconButton, TextField } from "@webstudio-is/design-system";
import { Cross2Icon, MagnifyingGlassIcon } from "@webstudio-is/icons";
import { components } from "@webstudio-is/react-sdk";
import type { SelectedInstanceData } from "~/shared/canvas-components";

type OnSearch = (search: string) => void;

const useSearch = (onSearch: OnSearch): [string, OnSearch] => {
  const [search, setSearch] = useState("");
  return [
    search,
    (search: string) => {
      setSearch(search);
      onSearch(search);
    },
  ];
};

type SearchProps = {
  onSearch: OnSearch;
  selectedInstanceData: SelectedInstanceData;
};

export const Search = ({ onSearch, selectedInstanceData }: SearchProps) => {
  const [search, setSearch] = useSearch(onSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <TextField
      type="search"
      value={search}
      inputRef={inputRef}
      prefix={
        <IconButton aria-label="Search">
          <MagnifyingGlassIcon />
        </IconButton>
      }
      suffix={
        search.length > 0 && (
          <IconButton
            aria-label="Reset search"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
          >
            <Cross2Icon />
          </IconButton>
        )
      }
      placeholder={components[selectedInstanceData.component].label}
      onChange={(event) => {
        const { value } = event.target;
        setSearch(value.toLowerCase());
      }}
    />
  );
};
