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
  return (
    <TextField
      type="search"
      value={search}
      onCancel={() => {
        setSearch("");
      }}
      placeholder="Search"
      onChange={(event) => {
        const { value } = event.target;
        setSearch(value.toLowerCase());
      }}
    />
  );
};
