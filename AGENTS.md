# Error handling

- Never use human-readable error messages to drive application logic. Do not match message strings, prefixes, substrings, or regular expressions to classify errors, choose status codes, retry, recover, or grant access.
- Use typed errors within a process and stable codes, discriminants, HTTP statuses, and structured details across process and API boundaries. Define the signal at the error's source and preserve it through wrappers and serialization.
- Treat missing records that are normal user scenarios explicitly. Use optional lookups such as `.maybeSingle()` when zero rows is valid; enforce uniqueness in the database.
- For dependencies without a structured error signal, use documented APIs or validate inputs/results directly. Do not add message-based compatibility fallbacks.
- Keep error messages for display and logging. Never include credentials or tokens in error text.
- When changing an error contract, inspect its producers and consumers and verify the relevant transport and recovery paths. Tests should demonstrate that changing message wording cannot change behavior.
- Normalize transport and validation errors in shared error-handling code. UI components should consume normalized errors and add only UI-specific context, rather than decode transport payloads or duplicate generic error formatting.
