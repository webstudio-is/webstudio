import { useEffect } from "react";
import { updateCollaborativeInstanceRect } from "./collaborative-instance";

export const useUpdateCollaborativeInstanceRect = () => {
  useEffect(updateCollaborativeInstanceRect, []);
};
