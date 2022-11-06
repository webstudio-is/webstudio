import { useCallback, useEffect, useRef, useState } from "react";

export const useFilter = <Item>({
  items,
  onReset,
}: {
  onReset: () => void;
  items: Array<Item>;
}) => {
  const [filteredItems, setFilteredItems] = useState(items);
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  const resetFilteredItems = useCallback(() => {
    setFilteredItems(items);
  }, [items]);

  useEffect(() => {
    setFilteredItems(items);
    onResetRef.current();
  }, [items]);

  return {
    filteredItems,
    resetFilteredItems,
    setFilteredItems,
  };
};
