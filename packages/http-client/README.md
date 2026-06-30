# Webstudio HTTP Client

Function-call client for Webstudio HTTP and TRPC APIs.

This package owns network details for Builder/project calls so callers do not
need route URLs, TRPC procedure paths, auth header names, staged upload
details, or response validation details.

- parsing Builder project URLs
- project bundle load/import helpers and sync bundle normalization
- staged uploads, asset uploads, and import-with-assets orchestration
- project API read/write helpers
- API compatibility headers and error messages

CLI command names, help text, manuals, and command-specific output formatting
belong in the CLI package, not here.
