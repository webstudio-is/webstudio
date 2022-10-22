import { useRef, useState } from "react";
import { IconButton, TextField } from "@webstudio-is/design-system";
import { Cross2Icon, MagnifyingGlassIcon } from "@webstudio-is/icons";

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
};

export const Search = ({ onSearch }: SearchProps) => {
  const [search, setSearch] = useSearch(onSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <TextField
      type="search"
      value={search}
      inputRef={inputRef}
      prefix={
        <IconButton aria-label="Search" css={{ color: "$hint" }} tabIndex={-1}>
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
      placeholder="Search"
      onChange={(event) => {
        const { value } = event.target;
        setSearch(value.toLowerCase());
      }}
    />
  );
};
