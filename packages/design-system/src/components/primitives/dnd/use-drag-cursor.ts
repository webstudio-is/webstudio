import { useEffect } from "react";

export const useDragCursor = (isDragging: boolean, cursor = "grabbing") => {
  useEffect(() => {
    if (isDragging) {
      const html = document.documentElement;
      const originalValue = html.style.getPropertyValue("cursor");
      const originalPriority = html.style.getPropertyPriority("cursor");
      html.style.setProperty("cursor", cursor, "important");
      return () => {
        html.style.setProperty("cursor", originalValue, originalPriority);
      };
    }
  }, [isDragging, cursor]);
};
