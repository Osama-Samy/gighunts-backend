import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./lib/env.js";

// Initialize base app
const app = await createApp();
const port = process.env["PORT"] || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log("ENV:", env["NODE_ENV"]);
  console.log("DB:", env["DB_FILE_NAME"]);
});

