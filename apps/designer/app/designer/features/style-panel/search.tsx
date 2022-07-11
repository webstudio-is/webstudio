import { useState } from "react";
import { css, IconButton, TextField } from "~/shared/design-system";
import { Cross1Icon } from "~/shared/icons";

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
        css={{
          padding: "$2",
          boxShadow: "0 0 0 1px $colors$slate7",
          bc: "$colors$slate3",
          "&:focus": {
            bc: "$colors$slate1",
            boxShadow: "0 0 0 2px $colors$blue10",
          },
        }}
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
        css={{
          // @todo: feels wrong to use transform for this, would setting width/height on the icon directly be a better approach?
          transform: "scale(.75)",
          "&:disabled path": { fill: "none" },
        }}
      >
        <Cross1Icon />
      </IconButton>
    </form>
  );
};
