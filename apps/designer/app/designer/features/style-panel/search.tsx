import { KeyboardEvent, useState } from "react";
import { IconButton, TextField } from "@webstudio-is/design-system";
import { Cross2Icon, MagnifyingGlassIcon } from "@webstudio-is/icons";
import { components } from "@webstudio-is/react-sdk";
import type { SelectedInstanceData } from "~/shared/canvas-components";
import { Box } from "@webstudio-is/design-system";

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
  return (
    <Box
      as="form"
      css={{ position: "relative" }}
      onReset={() => {
        setSearch("");
      }}
      onKeyDown={(event: KeyboardEvent<HTMLFormElement>) => {
        if (event.key === "Escape") {
          event.currentTarget.reset();
        }
      }}
    >
      <TextField
        value={search}
        css={{
          fontSize: "$2",
          height: "$sizes$6",
          padding: "$3 calc($2 + $1)",
          border: "2px solid $colors$slate7",
          bc: "$colors$slate3",
          borderRadius: "$2",
          boxShadow: "none",
          "&:focus": {
            bc: "$colors$slate1",
            borderWidth: 2,
            borderColor: "$colors$blue10",
            boxShadow: "none",
          },
        }}
        placeholder={components[selectedInstanceData.component].label}
        onChange={(event) => {
          const { value } = event.target;
          setSearch(value.toLowerCase());
        }}
      />
      <IconButton
        type="reset"
        aria-label="Reset search"
        css={{
          color: "$slate9",
          position: "absolute",
          top: "50%",
          right: 0,
          transform: "translate(-25%,-50%)",
        }}
      >
        {search.length === 0 ? <MagnifyingGlassIcon /> : <Cross2Icon />}
      </IconButton>
    </Box>
  );
};
