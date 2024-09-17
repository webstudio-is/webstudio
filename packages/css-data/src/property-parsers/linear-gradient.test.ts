import { test } from "@jest/globals";
import {
  parseLinearGradient,
  reconstructLinearGradient,
} from "./linear-gradient";

test("parse linear-gradient", () => {
  const gradient =
    "linear-gradient(to right, red 20%, orange 20% 40%, yellow 40% 60%, green 60% 80%, blue 80%)";
  const parsed = parseLinearGradient(gradient);
  console.log(parsed);
});
