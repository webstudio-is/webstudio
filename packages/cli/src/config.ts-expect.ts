import { expectType, type TypeEqual } from "ts-expect";
import { Templates } from "@webstudio-is/sdk";
import { PROJECT_TEMPLATES } from "./config";

// We must ensure the validated template type always matches the CLI-supported templates.
// This is crucial for security, as template names can be used in CLI/bash environments.
// A TypeScript failure here means the Templates type is not consistent with the CLI templates.
expectType<TypeEqual<(typeof PROJECT_TEMPLATES)[number]["value"], Templates>>(
  true
);
