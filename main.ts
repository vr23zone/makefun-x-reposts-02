// Entry program for the make.fun "X reposts" bounty (makefun-x-reposts-02).
//
// The whole job of this file is deliberately small: take the POSTS.json that
// lives next to it in the bot directory, make sure it really is a list of X
// post addresses, and copy it byte-for-byte into the harness output folder.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const botDir: string = process.env.MAKEFUN_BOT_DIR ?? "/bot";
const outputDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const MAX_POSTS = 15;

// An X post address looks like https://x.com/<handle>/status/<digits>
// (the older twitter.com host is accepted too).
const POST_ADDRESS = /^https:\/\/(x\.com|twitter\.com)\/[^/\s]+\/status\/\d+$/;

function die(message: string): never {
  console.error(`[x-reposts] error: ${message}`);
  process.exit(1);
}

// Reads POSTS.json from the bot directory and returns its raw bytes together
// with the validated list of post addresses it names.
function readEntryFile(): { bytes: Buffer; posts: string[] } {
  const entryPath = join(botDir, "POSTS.json");
  let bytes: Buffer;
  try {
    bytes = readFileSync(entryPath);
  } catch {
    die(`could not read ${entryPath}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(bytes.toString("utf8"));
  } catch {
    die("POSTS.json is not valid JSON");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    die("POSTS.json must be a JSON object");
  }
  const posts = (data as { posts?: unknown }).posts;
  if (!Array.isArray(posts)) {
    die('POSTS.json must carry a "posts" array');
  }
  if (posts.length > MAX_POSTS) {
    die(`POSTS.json names ${posts.length} posts; at most ${MAX_POSTS} are allowed`);
  }
  for (const item of posts) {
    if (typeof item !== "string" || !POST_ADDRESS.test(item)) {
      die(`not an X post address: ${String(item)}`);
    }
  }
  return { bytes, posts: posts as string[] };
}

// Copies the validated entry file into the output directory, creating that
// directory first when the harness has not made it yet.
function main(): void {
  const { bytes, posts } = readEntryFile();
  mkdirSync(outputDir, { recursive: true });
  const target = join(outputDir, "POSTS.json");
  writeFileSync(target, bytes);
  if (posts.length === 0) {
    console.log("[x-reposts] warning: POSTS.json names no posts yet; copied the empty list.");
  } else {
    console.log(`[x-reposts] copied POSTS.json naming ${posts.length} post(s) to ${target}`);
  }
}

main();
