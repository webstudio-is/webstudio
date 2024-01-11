# Webstudio AI

The Webstudio AI package offers two main features:

### LLM Abstraction

A minimal abstraction for a generic, vendor-agnostic messages format and LLM client, allowing for building features without using model-specific APIs.

See [details](./src/models/README.md).

An implementation of the above that uses the OpenAI chat completion endpoint is [available here](./src/models/gpt.ts).

### Chains

A common interface for chains. Chains are regular async functions that can execute an arbitrary number of steps, including calling a LLM via a [model client](./src/models).

See [details](./src/chains/README.md).

## Usage

Install the package

```
pnpm i @webstudio-is/ai
```

For an example usage check out the [base example](./src/chains/README.md#example-chain) and [the copywriter chain](./src/chains/copywriter/index.ts) that generates copy for Webstudio.

### Prompt templates

This package comes with a small CLI that allows to turn prompt templates from markdown files to TypeScript modules, which is what you would use in your chain.

```
pnpm run build:prompts
```
