import { drizzle } from "drizzle-orm/better-sqlite3";
import { reset, seed } from "drizzle-seed";
import { env } from "../../lib/env.js";
import * as schema from "../schema/index.js";
import { seedPlatforms } from "./seeders/platform.seeder.js";

async function main() {
  const seedDB = drizzle(env.DB_FILE_NAME);

  await reset(seedDB, {
    platforms: schema.platforms,
    gigs: schema.gigs,
    gigSkills: schema.gigSkills,
    skillCategories: schema.skillCategories,
    skills: schema.skills,
  });
  await seed(
    seedDB,
    {
      skillCategories: schema.skillCategories,
      skills: schema.skills,
      // gigs: schema.gigs,
      // gigSkills: schema.gigSkills,
      // platforms: schema.platforms,
    },
    { count: 20 },
  ).refine(() => ({
    // platforms: {
    //   with: {
    //     gigs: 2,
    //   },
    // },
    // gigs: {
    //   with: {
    //     gigSkills: 2,
    //   },
    // },
    skillCategories: {
      with: {
        skills: 5,
      },
    },
  }));

  await seedPlatforms().catch((err) => {
    console.error("Error seeding platforms:", err);
    process.exit(1);
  });
}

main();
