export const allocateUniqueContentBlockTemplateName = ({
  name,
  existingNames,
}: {
  name: string;
  existingNames: ReadonlySet<string>;
}) => {
  const normalizedName = name.trim();
  if (existingNames.has(normalizedName) === false) {
    return normalizedName;
  }

  const suffixMatch = /^(.*) (\d+)$/.exec(normalizedName);
  let baseName = normalizedName;
  let index = 2;
  if (suffixMatch !== null) {
    const suffix = Number(suffixMatch[2]);
    if (suffix >= 2 && Number.isSafeInteger(suffix + 1)) {
      baseName = suffixMatch[1];
      index = suffix + 1;
    }
  }
  let candidate = `${baseName} ${index}`;
  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${baseName} ${index}`;
  }
  return candidate;
};
