# Seeders

## Overview

Seeders populate the database with dummy/initial data for development or staging environments. We use `@faker-js/faker` to generate mock data.

## Directory Structure

Seed scripts are located in `src/db/seeders/`. Each file should match the `.seeder.js` extension and export a `run` function.

Example: `src/db/seeders/gigs.seeder.js`

```js
export async function run() {
  // logic to generate and insert gigs
}
```

## Running Seeders

The main seeder executor is `src/db/seed.js`. It reads the `.seeder.js` files and runs their exported `run` functions.

### Run all seeders

```bash
node src/db/seed.js
```

### Run a specific seeder

Pass the name of the seeder as an argument:

```bash
node src/db/seed.js gigs
```

### Fresh Seed (Wipe database first)

Use the `--fresh` flag to delete all rows from all application tables before seeding:

```bash
node src/db/seed.js --fresh
```

This avoids breaking foreign key constraints by temporarily disabling `PRAGMA foreign_keys = OFF` and wiping all `drizzle_*` and `sqlite_*` excluded tables.
