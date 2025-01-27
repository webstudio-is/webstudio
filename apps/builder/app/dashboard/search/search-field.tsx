import { useStore } from "@nanostores/react";
import { SearchField } from "@webstudio-is/design-system";
import { atom } from "nanostores";

export const $searchState = atom("");

export const Search = () => {
  const searchState = useStore($searchState);

  return (
    <SearchField
      value={searchState ?? undefined}
      onChange={(event) => {
        const value = event.currentTarget.value.trim();
        $searchState.set(value);
      }}
      onCancel={() => {
        $searchState.set("");
      }}
      autoFocus
      placeholder="Search for anything"
    />
  );
};
