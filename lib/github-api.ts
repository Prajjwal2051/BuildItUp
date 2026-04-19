// lib/github-api.ts
// GitHub REST API v3 client — all requests are authenticated with a user OAuth token.
// Functions are kept pure (no DB calls) so they can be reused in both server actions and route handlers.

const GH = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

// ── List user repos ──────────────────────────────────────────────────────────
export async function listRepos(token: string) {
  const res = await fetch(
    `${GH}/user/repos?sort=updated&per_page=50&type=all`,
    { headers: headers(token) },
  );
  if (!res.ok) throw new Error(`listRepos failed: ${res.status}`);
  return res.json() as Promise<
    Array<{
      full_name: string;
      name: string;
      default_branch: string;
      html_url: string;
      private: boolean;
    }>
  >;
}

// ── Create a repo ────────────────────────────────────────────────────────────
export async function createRepo(
  token: string,
  name: string,
  isPrivate = true,
) {
  const res = await fetch(`${GH}/user/repos`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name, private: isPrivate, auto_init: true }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(
      (e as { message?: string }).message ?? "createRepo failed",
    );
  }
  return res.json() as Promise<{
    full_name: string;
    default_branch: string;
    html_url: string;
  }>;
}

// ── Get full repo file tree ──────────────────────────────────────────────────
export async function getRepoTree(
  token: string,
  owner: string,
  repo: string,
  branch = "main",
) {
  const res = await fetch(
    `${GH}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: headers(token) },
  );
  if (!res.ok) throw new Error(`getRepoTree failed: ${res.status}`);
  const data = await res.json();
  return (
    data.tree as Array<{ path: string; sha: string; type: string }>
  ).filter((f) => f.type === "blob");
}

// ── Get single file content (decoded from base64) ────────────────────────────
export async function getFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch = "main",
) {
  const res = await fetch(
    `${GH}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: headers(token) },
  );
  if (!res.ok) throw new Error(`getFile failed: ${res.status}`);
  const data = (await res.json()) as { sha: string; content: string };
  return {
    sha: data.sha,
    content: Buffer.from(data.content, "base64").toString("utf-8"),
  };
}

// ── Create or update a file ──────────────────────────────────────────────────
// fileSha is required when updating an existing file, omit for new files.
export async function putFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  fileSha?: string,
  branch = "main",
) {
  const res = await fetch(
    `${GH}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf-8").toString("base64"),
        branch,
        ...(fileSha ? { sha: fileSha } : {}),
      }),
    },
  );
  if (!res.ok) {
    const e = await res.json();
    throw new Error((e as { message?: string }).message ?? "putFile failed");
  }
}

// ── Commit history ───────────────────────────────────────────────────────────
export async function getCommits(
  token: string,
  owner: string,
  repo: string,
  branch = "main",
  perPage = 30,
) {
  const res = await fetch(
    `${GH}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${perPage}`,
    { headers: headers(token) },
  );
  if (!res.ok) throw new Error(`getCommits failed: ${res.status}`);
  return res.json() as Promise<
    Array<{
      sha: string;
      commit: {
        message: string;
        author: { name: string; date: string };
      };
      html_url: string;
    }>
  >;
}

// ── Real diff between two SHAs ───────────────────────────────────────────────
export async function compareCommits(
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string,
) {
  const res = await fetch(
    `${GH}/repos/${owner}/${repo}/compare/${base}...${head}`,
    { headers: headers(token) },
  );
  if (!res.ok) throw new Error(`compareCommits failed: ${res.status}`);
  return res.json() as Promise<{
    files: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      patch?: string; // real unified diff string from GitHub
    }>;
    commits: Array<{
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
    }>;
  }>;
}
