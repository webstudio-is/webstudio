export const createCopyName = (
  name: string,
  isTaken: (candidate: string) => boolean,
  numberFirstCopy = false
) => {
  let copyNumber = 1;
  while (true) {
    const suffix =
      copyNumber === 1 && !numberFirstCopy ? " copy" : ` copy ${copyNumber}`;
    const candidate = `${name}${suffix}`;
    if (isTaken(candidate) === false) {
      return candidate;
    }
    copyNumber += 1;
  }
};
