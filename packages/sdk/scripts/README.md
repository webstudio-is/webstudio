# SDK generation scripts

## Schema.org vocabulary

Run `pnpm --filter @webstudio-is/sdk build:schema-org-data` to refresh
`src/__generated__/schema-org-data.ts` from the pinned Schema.org release and
checksummed HTTPS type and property CSV files. Upgrade the version and both
checksums together after reviewing the generated vocabulary diff.

The generated data contains vocabulary names, type inheritance, property
domains and ranges, and superseded terms. Runtime validation deliberately
treats vocabulary mismatches as warnings: Schema.org extensions and custom
JSON-LD contexts remain valid. Structural JSON-LD errors are blocking.

This validator does not guarantee eligibility for a search-engine rich result.
Search engines maintain additional type-specific requirements and quality
policies that should be checked against rendered or published pages.
