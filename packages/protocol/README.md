# Protocol

`@webstudio-is/protocol` owns Webstudio data exchange protocols.

The project bundle is the external export/import artifact used by sync, local
`.webstudio/data.json`, project import, transferred asset files, and prebuild.
This package owns the assembled bundle schemas, transfer RPC payloads, and
bundle compatibility/version helpers.

Domain models such as pages, assets, and serialized builds remain owned by
their domain packages and are composed here through schema-only entrypoints.
Do not copy those schemas into this package.
