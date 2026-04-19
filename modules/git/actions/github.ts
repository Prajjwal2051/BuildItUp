"use server";

// Real GitHub server actions — push/pull/history/diff via GitHub REST API.
// These complement the local MongoDB commit actions in ./index.ts.
// The local GitCommit model is preserved as an offline cache/backup layer.

import { db } from "@/lib/db";
import { auth } from "@/auth";
import {
  listRepos,
  createRepo,
  getRepoTree,
  getFile,
  putFile,
  getCommits,
  compareCommits,
} from "@/lib/github-api";

// ── Helper: retrieve the stored GitHub OAuth token ───────────────────────────
async function getToken(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { access_token: true },
  });

  if (!account?.access_token) {
    throw new Error(
      "NO_GITHUB_TOKEN: Sign in with GitHub first (or reconnect your GitHub account).",
    );
  }
  return account.access_token;
}

// ── List repos (for the "Link repo" dropdown) ────────────────────────────────
export async function listUserRepos() {
  const token = await getToken();
  return listRepos(token);
}

// ── Create a new repo and link it to the playground ──────────────────────────
export async function createAndLinkRepo(
  playgroundId: string,
  repoName: string,
  isPrivate: boolean,
) {
  const token = await getToken();
  const repo = await createRepo(token, repoName, isPrivate);

  await db.playground.update({
    where: { id: playgroundId },
    data: {
      githubRepo: repo.full_name,
      githubBranch: repo.default_branch,
    },
  });

  return repo;
}

// ── Link an existing repo to the playground ──────────────────────────────────
export async function linkExistingRepo(
  playgroundId: string,
  fullName: string,
  branch: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.playground.update({
    where: { id: playgroundId },
    data: { githubRepo: fullName, githubBranch: branch },
  });
}

// ── Unlink repo from playground ──────────────────────────────────────────────
export async function unlinkRepo(playgroundId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.playground.update({
    where: { id: playgroundId },
    data: { githubRepo: null, githubBranch: null },
  });
}

// ── Get linked repo info ──────────────────────────────────────────────────────
export async function getLinkedRepo(playgroundId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const playground = await db.playground.findUnique({
    where: { id: playgroundId },
    select: { githubRepo: true, githubBranch: true },
  });
  return playground;
}

// ── PUSH: playground files → GitHub ──────────────────────────────────────────
export async function pushToGitHub(
  playgroundId: string,
  commitMessage: string,
) {
  const token = await getToken();

  const playground = await db.playground.findUnique({
    where: { id: playgroundId },
    include: { templateFile: true },
  });

  if (!playground?.githubRepo) {
    throw new Error(
      "No GitHub repo linked to this playground. Link a repo first.",
    );
  }

  const [owner, repo] = playground.githubRepo.split("/");
  const branch = playground.githubBranch ?? "main";

  // Extract file map from templateFile content
  const rawContent = playground.templateFile[0]?.content;
  if (!rawContent || typeof rawContent !== "object") {
    throw new Error("No files found in playground to push.");
  }

  const files: Record<string, string> = {};
  for (const [path, value] of Object.entries(
    rawContent as Record<string, unknown>,
  )) {
    if (typeof value === "string") {
      files[path] = value;
    } else if (
      value &&
      typeof value === "object" &&
      "content" in value &&
      typeof (value as { content: unknown }).content === "string"
    ) {
      files[path] = (value as { content: string }).content;
    }
  }

  if (Object.keys(files).length === 0) {
    throw new Error("No valid files found to push.");
  }

  // Get existing file SHAs so we can update (not just create) files
  let shaMap = new Map<string, string>();
  try {
    const tree = await getRepoTree(token, owner, repo, branch);
    shaMap = new Map(tree.map((f) => [f.path, f.sha]));
  } catch {
    // Repo might be empty (just created) — all files are new, no SHAs needed
  }

  // Push each file sequentially to avoid race conditions on the same tree SHA
  for (const [path, content] of Object.entries(files)) {
    await putFile(
      token,
      owner,
      repo,
      path,
      content,
      commitMessage,
      shaMap.get(path),
      branch,
    );
  }

  return {
    pushed: Object.keys(files).length,
    repoUrl: `https://github.com/${playground.githubRepo}`,
  };
}

// ── PULL: GitHub → playground files ──────────────────────────────────────────
export async function pullFromGitHub(playgroundId: string) {
  const token = await getToken();

  const playground = await db.playground.findUnique({
    where: { id: playgroundId },
  });
  if (!playground?.githubRepo) {
    throw new Error("No GitHub repo linked to this playground.");
  }

  const [owner, repo] = playground.githubRepo.split("/");
  const branch = playground.githubBranch ?? "main";

  const tree = await getRepoTree(token, owner, repo, branch);

  const entries = await Promise.all(
    tree.map(async (node) => {
      const { content } = await getFile(
        token,
        owner,
        repo,
        node.path,
        branch,
      );
      return [node.path, content] as [string, string];
    }),
  );

  await db.templateFile.update({
    where: { playgroundId },
    data: { content: Object.fromEntries(entries) },
  });

  return { pulled: entries.length };
}

// ── HISTORY: real GitHub commit log ──────────────────────────────────────────
export async function getGitHubHistory(playgroundId: string) {
  const token = await getToken();

  const playground = await db.playground.findUnique({
    where: { id: playgroundId },
    select: { githubRepo: true, githubBranch: true },
  });
  if (!playground?.githubRepo) {
    throw new Error("No GitHub repo linked to this playground.");
  }

  const [owner, repo] = playground.githubRepo.split("/");
  return getCommits(
    token,
    owner,
    repo,
    playground.githubBranch ?? "main",
  );
}

// ── DIFF: real unified patch from GitHub between two SHAs ────────────────────
export async function getGitHubDiff(
  playgroundId: string,
  baseSha: string,
  headSha: string,
) {
  const token = await getToken();

  const playground = await db.playground.findUnique({
    where: { id: playgroundId },
    select: { githubRepo: true },
  });
  if (!playground?.githubRepo) {
    throw new Error("No GitHub repo linked to this playground.");
  }

  const [owner, repo] = playground.githubRepo.split("/");
  return compareCommits(token, owner, repo, baseSha, headSha);
}
