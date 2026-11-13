# Webstudio SDK

## Package boundary

Owns shared project data, schemas, and runtime contracts. It must remain independent of UI frameworks, Builder application code, and routing frameworks. Keep environment-specific code in explicit entry points so browser imports do not pull in server-only dependencies.
