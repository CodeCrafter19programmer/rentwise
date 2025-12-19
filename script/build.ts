import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  // For Vercel, we only need to build the frontend
  // The API routes will be handled by Vercel's serverless functions
  const isVercel = process.env.VERCEL === "1" || process.env.CI === "true";
  
  if (!isVercel) {
    // For local production builds, clean dist directory
    await rm("dist", { recursive: true, force: true });
  }

  console.log("building client...");
  await viteBuild();
  
  if (!isVercel) {
    console.log("✓ Client build complete");
    console.log("Note: For Vercel deployment, only the client needs to be built.");
    console.log("API routes will be handled automatically by Vercel serverless functions.");
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
