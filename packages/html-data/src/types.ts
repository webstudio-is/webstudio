export type Attribute =
  | { name: string; description?: string; type: "boolean" }
  | { name: string; description?: string; type: "string" }
  | { name: string; description?: string; type: "number" }
  | { name: string; description?: string; type: "enum"; values: string[] };

export type AttributesByTag = Record<string, Attribute[]>;
