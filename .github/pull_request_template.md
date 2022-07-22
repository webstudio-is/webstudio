## Before requesting a review

- [ ] if the PR is WIP - use draft mode
- [ ] made a self-review
- [ ] added inline comments where things may be not obvious (the "why", not "what")
- [ ] what kind of review is needed?
  - [ ] conceptual
  - [ ] detailed
  - [ ] with testing

## Test cases

- [ ] step by step interaction description and what is expected to happen

## Before merging

- [ ] tested locally and on preview environment
- [ ] updated [test cases](https://github.com/webstudio-is/webstudio-designer/blob/main/apps/designer/docs/test-cases.md) document
- [ ] added tests
- [ ] if any new env variables are added, added them to `.env.example` and the `designer/env-check.js` if mandatory
