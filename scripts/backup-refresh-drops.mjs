import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fetchSnapshot } from "./refresh-drops.mjs";

const repository = "https://github.com/ATritle/MicroscapeWiki.git";
const branch = "refs/heads/live-data";
const freshness = 10 * 60_000;
const [, , directory] = process.argv;
if (!directory) throw new Error("Provide a directory for the backup publisher’s state.");
const state = resolve(directory);
const cache = join(state, "snapshot.git");
const log = join(state, "last-run.log");

function git(args, input) {
  const result = spawnSync("git", args, {
    cwd: cache,
    input,
    encoding: "utf8",
    timeout: 45_000,
    windowsHide: true,
    env: {...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never"}
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || "Git exited with " + result.status);
  return result.stdout.trimEnd();
}

function readPublishedSnapshot() {
  git(["fetch", "--no-tags", "--depth=1", repository, branch]);
  const head = git(["rev-parse", "FETCH_HEAD"]);
  const snapshot = JSON.parse(git(["show", head + ":drops.json"]));
  return {head, snapshot};
}

function isFresh(snapshot) {
  return Number.isFinite(snapshot.checkedAt) && Date.now() - snapshot.checkedAt < freshness;
}

async function publish() {
  mkdirSync(cache, {recursive: true});
  if (!existsSync(join(cache, "HEAD"))) git(["init", "--bare", "--quiet"]);

  const current = readPublishedSnapshot();
  if (isFresh(current.snapshot)) return "The public feed was already refreshed within the last 10 minutes.";

  const snapshot = await fetchSnapshot();
  const blob = git(["hash-object", "-w", "--stdin"], JSON.stringify(snapshot) + "\n");
  const files = git(["ls-tree", current.head]).split("\n").filter(line => !line.endsWith("\tdrops.json"));
  files.push("100644 blob " + blob + "\tdrops.json");
  const tree = git(["mktree"], files.join("\n") + "\n");
  const commit = git([
    "-c", "user.name=Microscape Wiki feed backup",
    "-c", "user.email=155339308+ATritle@users.noreply.github.com",
    "commit-tree", tree, "-p", current.head, "-m", "Refresh Microscape live drops from Windows backup"
  ]);

  try {
    git(["push", repository, commit + ":" + branch]);
  } catch (error) {
    // A GitHub Actions run may have published while this task was fetching the game feed.
    const latest = readPublishedSnapshot();
    if (latest.head !== current.head && isFresh(latest.snapshot)) {
      return "Another updater published a fresh snapshot.";
    }
    throw error;
  }
  return "Published " + snapshot.events.length + " drop events and " + snapshot.energyStreams.length + " Energy channels. Commit " + commit + ".";
}

try {
  const message = await publish();
  writeFileSync(log, new Date().toISOString() + " " + message + "\n");
  console.log(message);
} catch (error) {
  mkdirSync(state, {recursive: true});
  writeFileSync(log, new Date().toISOString() + " " + error.message + "\n");
  console.error(error.message);
  process.exitCode = 1;
}
