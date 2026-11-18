import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { fetchSnapshot } from "../workers/live-drops.mjs";

export { fetchSnapshot, makeSnapshot } from "../workers/live-drops.mjs";

async function main(output) {
  if (!output) throw new Error("Provide a path for the live drops snapshot.");
  const snapshot = await fetchSnapshot();
  await writeFile(output, JSON.stringify(snapshot) + "\n");
  console.log("Recorded " + snapshot.events.length + " active Microscape events.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv[2]);
}
