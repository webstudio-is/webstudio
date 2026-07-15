# Protocol

`@webstudio-is/protocol` owns Webstudio data exchange protocols.

The project bundle is the external export/import artifact used by sync, local
`.webstudio/data.json`, project import, transferred asset files, and prebuild.
This package owns the assembled bundle schemas, transfer RPC payloads, and
bundle compatibility/version helpers.

Domain models such as pages, assets, and serialized builds remain owned by
their domain packages and are composed here through schema-only entrypoints.
Do not copy those schemas into this package.

## Terminology

**Project bundle** is the authoritative external project artifact. It is used by
sync, `.webstudio/data.json`, project import, transferred asset files, and
prebuild.

**Data envelope** is a serialized single-key object whose key is a versioned
Webstudio marker, for example `{ "@webstudio/instance/v0.1": data }`. The
envelope identifies the payload version and lets consumers detect malformed
Webstudio-owned data before falling back to other formats.

**Transfer data** is the domain payload inside a data envelope. Examples include
`InstanceTransferData`, `InstancesTransferData`, and `PageTransferData`.
Transfer data is portable and detached from a project; insertion/import remaps
ids and merges it into authoritative project state. Runtime-owned transfer
formats live in `@webstudio-is/project-build/transfer`.

**Clipboard data** is a UI transport concern. Builder copy/paste may serialize
transfer data into a data envelope and place it on the browser clipboard, but
runtime and protocol code should name the reusable format as data envelope or
transfer data, not clipboard.
