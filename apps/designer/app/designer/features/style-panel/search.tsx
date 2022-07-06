import { useState } from "react";
import {
  css,
  IconButton,
  TextField,
} from "apps/designer/app/shared/design-system";
import { Cross1Icon } from "apps/designer/app/shared/icons";

const formStyle = css({
  position: "relative",
});

const resetStyle = css({
  position: "absolute",
  right: 0,
});

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
    <form
      className={formStyle()}
      onReset={() => {
        setSearch("");
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.reset();
        }
      }}
    >
      <TextField
        value={search}
        css={{ paddingRight: "$5" }}
        placeholder="Search property or value"
        onChange={(event) => {
          const { value } = event.target;
          setSearch(value.toLowerCase());
        }}
      />
      <IconButton
        disabled={search.length === 0}
        type="reset"
        aria-label="Reset search"
        className={resetStyle()}
      >
        <Cross1Icon />
      </IconButton>
    </form>
  );
};
