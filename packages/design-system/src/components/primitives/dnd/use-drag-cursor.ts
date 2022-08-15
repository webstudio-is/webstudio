import { useEffect } from "react";

export const useDragCursor = (isDragging: boolean, cursor = "grabbing") => {
  useEffect(() => {
    // possible
    if (document.body === null) {
      return;
    }

    if (isDragging) {
      const originalValue = document.body.style.getPropertyValue("cursor");
      const originalPriority =
        document.body.style.getPropertyPriority("cursor");
      document.body.style.setProperty("cursor", cursor, "important");
      return () => {
        document.body.style.setProperty(
          "cursor",
          originalValue,
          originalPriority
        );
      };
    }
  }, [isDragging, cursor]);
};
