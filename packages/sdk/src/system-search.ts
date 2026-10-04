import type { System } from "./schema/pages";

/** Preserve the existing last-value `search` binding while exposing every value. */
export const getSystemSearch = (
  searchParams: URLSearchParams
): Pick<System, "search" | "searchAll"> => {
  const search = Object.fromEntries(searchParams) as System["search"];
  const grouped = new Map<string, string[]>();
  for (const [name, value] of searchParams) {
    const values = grouped.get(name) ?? [];
    values.push(value);
    grouped.set(name, values);
  }
  return { search, searchAll: Object.fromEntries(grouped) };
};

/** Apply a native GET form's fields without collapsing repeated names. */
export const appendFormDataToSearchParams = (
  searchParams: URLSearchParams,
  formData: FormData,
  controlNames: Iterable<string>
) => {
  for (const name of new Set([...controlNames, ...formData.keys()])) {
    searchParams.delete(name);
  }
  for (const [name, value] of formData) {
    searchParams.append(name, typeof value === "string" ? value : value.name);
  }
};
