# Webstudio Fixtures

Fixtures are test projects that ensure the CLI and build process work correctly across different deployment targets.

### Updating Fixtures After Changes

```bash
# From repository root - updates all fixtures
pnpm fixtures
```

This command will:

1. Link all fixtures to their respective projects
2. Sync the latest data from the development environment
3. Build all fixtures with the latest code

### Working with Individual Fixtures

```bash
# Go to fixture folder
cd fixtures/webstudio-features

# Link to project
pnpm fixtures:link

# Sync latest data
pnpm fixtures:sync

# Build fixture
pnpm fixtures:build

# Start it
pnpm run dev
```

## Adding Assets to Fixtures

To add a new asset (image, video, audio, etc.) to a fixture:

1. **Publish to staging**

   - Make your changes in the builder
   - Publish to the staging environment

2. **Get the build ID from CI**

   - After publishing, check the CI logs
   - Find the build ID that was created

3. **Update the fixture's build ID**

   - Edit `fixtures/[fixture-name]/package.json`
   - Update the `--buildId` parameter in the `fixtures:sync` script

   ```json
   "fixtures:sync": "pnpm cli sync --buildId NEW_BUILD_ID_HERE && pnpm prettier --write ./.webstudio/"
   ```

4. **Sync with the correct environment**

   ```bash
   # Go to fixture folder
   cd fixtures/webstudio-features

   # Sync from staging environment (replace with your branch)
   BUILDER_HOST=fix-assets.staging.webstudio.is pnpm run fixtures
   ```

5. **Fix the origin URL**

   - After syncing, edit `.webstudio/data.json`
   - Change the origin back to:

   ```json
   "origin": "https://main.development.webstudio.is"
   ```

   - This is necessary because sync changes it to the current branch

6. **Commit the changes**
   ```bash
   git add fixtures/
   git commit -m "chore: update fixtures with new assets"
   git push
   ```
