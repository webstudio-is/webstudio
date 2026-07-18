export type TestPartition = {
  index: number;
  total: number;
};

export const parseTestPartition = (
  value: string | undefined
): TestPartition | undefined => {
  if (value === undefined || value.trim() === "") {
    return;
  }
  const match = /^(\d+)\/(\d+)$/.exec(value);
  if (match === null) {
    throw new Error(
      `Expected E2E_TEST_PARTITION in the form 1/2, received ${value}`
    );
  }
  const position = Number(match[1]);
  const total = Number(match[2]);
  if (position < 1 || position > total) {
    throw new Error(`E2E_TEST_PARTITION is out of range: ${value}`);
  }
  return { index: position - 1, total };
};

export const isTestInPartition = (
  distributionIndex: number,
  partition: TestPartition | undefined
) =>
  partition === undefined ||
  distributionIndex % partition.total === partition.index;
