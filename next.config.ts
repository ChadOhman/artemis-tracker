import type { NextConfig } from "next";
import { execSync } from "child_process";

const gitHash = execSync("git rev-parse --short HEAD").toString().trim();

// Extract the last 30 feat: commits for the in-app changelog.
// Format: <short-hash>|<iso-date>|<subject>
let changelogData = "[]";
try {
  const raw = execSync(
    'git log --pretty=format:"%h|%cI|%s" -n 500 --no-merges'
  ).toString();
  const lines = raw.split("\n").filter(Boolean);
  const entries = lines
    .map((line) => {
      const [hash, date, ...rest] = line.split("|");
      const subject = rest.join("|");
      return { hash, date, subject };
    })
    .filter((e) => e.subject.startsWith("feat:") || e.subject.startsWith("feat "))
    .map((e) => ({
      hash: e.hash,
      date: e.date,
      // Strip "feat: " prefix
      subject: e.subject.replace(/^feat[:\s]+/, "").trim(),
    }))
    .slice(0, 30);
  changelogData = JSON.stringify(entries);
} catch {
  // git log failed — empty changelog
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: gitHash,
    NEXT_PUBLIC_CHANGELOG: changelogData,
  },
  headers: async () => [
    {
      source: "/",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Pragma", value: "no-cache" },
        { key: "Expires", value: "0" },
      ],
    },
    {
      source: "/:path((?!_next/static|_next/image|icon\\.svg).*)",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Pragma", value: "no-cache" },
        { key: "Expires", value: "0" },
      ],
    },
  ],
};

export default nextConfig;
