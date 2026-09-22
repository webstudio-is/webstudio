import { useEffect, useState, type DependencyList } from "react";

export const useAsyncValue = <Value>(
  getValue: () => PromiseLike<Value>,
  dependencies: DependencyList,
  initialValue: Value
) => {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    let active = true;
    void getValue().then((nextValue) => {
      if (active) {
        setValue(nextValue);
      }
    });
    return () => {
      active = false;
    };
    // The caller owns the dependency list for the async computation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  return value;
};
