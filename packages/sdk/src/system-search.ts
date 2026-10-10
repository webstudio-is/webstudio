import type { System } from "./schema/pages";

/** Keep one query value scalar and preserve repeated values in their order. */
export const getSystemSearch = (
  searchParams: URLSearchParams
): Pick<System, "search"> => {
  const grouped = new Map<string, string[]>();
  for (const [name, value] of searchParams) {
    const values = grouped.get(name) ?? [];
    values.push(value);
    grouped.set(name, values);
  }
  const search = Object.fromEntries(
    Array.from(grouped, ([name, values]) => [
      name,
      values.length === 1 ? values[0] : values,
    ])
  ) as System["search"];
  return { search };
};

export const appendSystemSearch = (
  searchParams: URLSearchParams,
  search: System["search"]
) => {
  for (const [name, value] of Object.entries(search)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        searchParams.append(name, item);
      }
    }
  }
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
