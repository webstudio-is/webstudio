// https://drafts.csswg.org/selectors

const location = [
  // ':link',
  ":visited",
  // ':any-link',
  ":local-link",
  // ':target',
  // ':target-within',
];

const userAction = [":hover", ":focus-visible", ":focus-within", ":active"];

const ability = [
  // ":enabled",
  ":disabled",
];

const validity = [
  // ":valid",
  ":invalid",
  // ":user-valid",
  ":user-invalid",
];

const required = [
  ":required",
  // ":optional"
];

export const pseudoClassesByTag: Record<string, string[]> = {
  "*": userAction,
  a: [...location],
  area: [...location],
  button: [...ability],
  label: [],
  input: [
    ":placeholder-shown",
    // @todo temporary until proper pseudo elements support is added
    "::placeholder",
    ...ability,
    ...validity,
    ...required,
    ":checked",
    // ":indeterminate",
    // :in-range
    // :out-of-range
    // ":open",
  ],
  textarea: [
    ":placeholder-shown",
    // @todo temporary until proper pseudo elements support is added
    "::placeholder",
    ...ability,
    ...validity,
    ...required,
  ],
  select: [
    ...ability,
    ...validity,
    ...required,
    // ":open"
  ],
  optgroup: [...ability],
  option: [...ability, ":checked", ":default"],
  fieldset: [...ability, ...validity],
  progress: [":indeterminate"],
  details: [":open"],
  dialog: [":open"],
};
