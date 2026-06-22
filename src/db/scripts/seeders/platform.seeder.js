import { db } from "../../index.js";
import { platforms } from "../../schema/platforms.js";

const DUMMY_PLATFORMS = [
  { id: 1, imageUrl: "assets/images/platfroms/guru.png", description: "Guru" },
  { id: 2, imageUrl: "assets/images/platfroms/remoteok.png", description: "RemoteOK" },
  { id: 3, imageUrl: "assets/images/platfroms/freelancer.png", description: "Freelancer" },
  { id: 4, imageUrl: "assets/images/platfroms/weworkremotely.png", description: "WeWorkRemotely" },
  { id: 5, imageUrl: "assets/images/platfroms/mostaq.png", description: "Mostaql" },
  { id: 6, imageUrl: "assets/images/platfroms/baaeed.png", description: "Baaeed" },
  { id: 7, imageUrl: "assets/images/platfroms/khamsat.png", description: "Khamsat" },
  { id: 8, imageUrl: "assets/images/platfroms/designcrowd.png", description: "DesignCrowd" },
  { id: 9, imageUrl: "assets/images/platfroms/nafezly.png", description: "Nafezly" },
  { id: 10, imageUrl: "assets/images/platfroms/kafiil.png", description: "Kafiil" },
  { id: 11, imageUrl: "assets/images/platfroms/tasmeemme.png", description: "Tasmeemme" },
  { id: 12, imageUrl: "assets/images/platfroms/bahr.png", description: "Bahr" },
  { id: 13, imageUrl: "assets/images/platfroms/jobspresso.png", description: "Jobspresso" },
];

export async function seedPlatforms() {
  console.log("Seeding platforms table exactly as requested...");
  await db.insert(platforms).values(DUMMY_PLATFORMS);

  console.log("Platforms seeded successfully!");
}
