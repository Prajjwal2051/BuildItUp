"use client";

import { useState, useTransition, useEffect } from "react";
import {
  createCommit,
  getCommitLog,
  getCommitSnapShot,
  retoreCommit,
} from "@/modules/git/actions";
import {
  pushToGitHub,
  pullFromGitHub,
  getGitHubHistory,
  getGitHubDiff,
  listUserRepos,
  createAndLinkRepo,
  linkExistingRepo,
  unlinkRepo,
  getLinkedRepo,
} from "@/modules/git/actions/github";
import { diffSnapshots, type FileDiff } from "@/lib/git-diff";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  GitBranch,
  Github,
  Upload,
  Download,
  History,
  Link2,
  Link2Off,
  Plus,
  ChevronDown,
  ExternalLink,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Types ─────────────────────────────────────────────────────────────────────

type LocalCommit = {
  id: string;
  message: string;
  createdAt: Date;
  author: { name: string | null; image: string | null };
};

type GHCommit = {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  html_url: string;
};

type GHFileDiff = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};

type UserRepo = {
  full_name: string;
  name: string;
  default_branch: string;
  html_url: string;
  private: boolean;
};

type Props = {
  playgroundId: string;
  currentSnapshot: Record<string, string>;
  className?: string;
};

// ── Main panel ────────────────────────────────────────────────────────────────

export function GitPanel({
  playgroundId,
  currentSnapshot,
  className,
}: Props) {
  // Top-level tabs
  const [tab, setTab] = useState<"local" | "github">("local");

  // ── Local tab state ──────────────────────────────────────────────────────
  const [localSubTab, setLocalSubTab] = useState<"commit" | "log" | "diff">(
    "commit",
  );
  const [commitMessage, setCommitMessage] = useState("");
  const [localLog, setLocalLog] = useState<LocalCommit[]>([]);
  const [localDiffs, setLocalDiffs] = useState<FileDiff[]>([]);
  const [selectedLocalCommit, setSelectedLocalCommit] = useState<
    string | null
  >(null);
  const [localFeedback, setLocalFeedback] = useState("");

  // ── GitHub tab state ─────────────────────────────────────────────────────
  const [ghSubTab, setGhSubTab] = useState<
    "repo" | "push" | "history" | "diff"
  >("repo");
  const [linkedRepo, setLinkedRepo] = useState<string | null>(null);
  const [linkedBranch, setLinkedBranch] = useState<string>("main");
  const [userRepos, setUserRepos] = useState<UserRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [newRepoName, setNewRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [pushMessage, setPushMessage] = useState("");
  const [ghHistory, setGhHistory] = useState<GHCommit[]>([]);
  const [ghDiffs, setGhDiffs] = useState<GHFileDiff[]>([]);
  const [ghFeedback, setGhFeedback] = useState("");
  const [showCreateRepo, setShowCreateRepo] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Load linked repo on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const info = await getLinkedRepo(playgroundId);
        if (info?.githubRepo) {
          setLinkedRepo(info.githubRepo);
          setLinkedBranch(info.githubBranch ?? "main");
        }
      } catch {
        // no-op
      }
    });
  }, [playgroundId]);

  // ── Local helpers ────────────────────────────────────────────────────────

  function flash(setter: (v: string) => void, msg: string) {
    setter(msg);
    setTimeout(() => setter(""), 3500);
  }

  function handleLocalCommit() {
    if (!commitMessage.trim()) return;
    startTransition(async () => {
      try {
        await createCommit(playgroundId, commitMessage.trim());
        setCommitMessage("");
        flash(setLocalFeedback, "✓ Committed successfully");
      } catch {
        flash(setLocalFeedback, "✗ Commit failed");
      }
    });
  }

  function handleOpenLocalLog() {
    setLocalSubTab("log");
    startTransition(async () => {
      const commits = await getCommitLog(playgroundId);
      setLocalLog(commits as LocalCommit[]);
    });
  }

  async function handleLocalViewDiff(commitId: string) {
    setSelectedLocalCommit(commitId);
    setLocalSubTab("diff");
    startTransition(async () => {
      const { snapshot } = await getCommitSnapShot(commitId);
      const fileDiffs = diffSnapshots(
        snapshot as Record<string, string>,
        currentSnapshot,
      );
      setLocalDiffs(fileDiffs);
    });
  }

  function handleLocalRestore(commitId: string) {
    if (
      !confirm(
        "Restore this commit? Your current changes will be overwritten.",
      )
    )
      return;
    startTransition(async () => {
      try {
        await retoreCommit(playgroundId, commitId);
        flash(setLocalFeedback, "✓ Restored to selected commit");
      } catch {
        flash(setLocalFeedback, "✗ Restore failed");
      }
    });
  }

  // ── GitHub helpers ───────────────────────────────────────────────────────

  function handleLoadRepos() {
    startTransition(async () => {
      try {
        const repos = await listUserRepos();
        setUserRepos(repos);
      } catch {
        flash(
          setGhFeedback,
          "✗ Could not load repos. Make sure you signed in with GitHub.",
        );
      }
    });
  }

  function handleLinkExisting() {
    if (!selectedRepo) return;
    const repo = userRepos.find((r) => r.full_name === selectedRepo);
    if (!repo) return;
    startTransition(async () => {
      try {
        await linkExistingRepo(
          playgroundId,
          repo.full_name,
          repo.default_branch,
        );
        setLinkedRepo(repo.full_name);
        setLinkedBranch(repo.default_branch);
        flash(setGhFeedback, `✓ Linked to ${repo.full_name}`);
      } catch {
        flash(setGhFeedback, "✗ Failed to link repo");
      }
    });
  }

  function handleCreateAndLink() {
    if (!newRepoName.trim()) return;
    startTransition(async () => {
      try {
        const repo = await createAndLinkRepo(
          playgroundId,
          newRepoName.trim(),
          isPrivate,
        );
        setLinkedRepo(repo.full_name);
        setLinkedBranch(repo.default_branch);
        setNewRepoName("");
        setShowCreateRepo(false);
        flash(setGhFeedback, `✓ Created and linked ${repo.full_name}`);
      } catch (e: unknown) {
        flash(
          setGhFeedback,
          `✗ ${e instanceof Error ? e.message : "Failed to create repo"}`,
        );
      }
    });
  }

  function handleUnlink() {
    if (!confirm("Unlink this repo from the playground?")) return;
    startTransition(async () => {
      try {
        await unlinkRepo(playgroundId);
        setLinkedRepo(null);
        setLinkedBranch("main");
        flash(setGhFeedback, "✓ Repo unlinked");
      } catch {
        flash(setGhFeedback, "✗ Failed to unlink");
      }
    });
  }

  function handlePush() {
    if (!pushMessage.trim()) return;
    startTransition(async () => {
      try {
        const result = await pushToGitHub(playgroundId, pushMessage.trim());
        setPushMessage("");
        flash(
          setGhFeedback,
          `✓ Pushed ${result.pushed} file(s) to GitHub`,
        );
      } catch (e: unknown) {
        flash(
          setGhFeedback,
          `✗ ${e instanceof Error ? e.message : "Push failed"}`,
        );
      }
    });
  }

  function handlePull() {
    if (!confirm("Pull from GitHub? This will overwrite your current files."))
      return;
    startTransition(async () => {
      try {
        const result = await pullFromGitHub(playgroundId);
        flash(setGhFeedback, `✓ Pulled ${result.pulled} file(s)`);
      } catch (e: unknown) {
        flash(
          setGhFeedback,
          `✗ ${e instanceof Error ? e.message : "Pull failed"}`,
        );
      }
    });
  }

  function handleLoadGHHistory() {
    setGhSubTab("history");
    startTransition(async () => {
      try {
        const commits = await getGitHubHistory(playgroundId);
        setGhHistory(commits);
      } catch (e: unknown) {
        flash(
          setGhFeedback,
          `✗ ${e instanceof Error ? e.message : "Failed to load history"}`,
        );
      }
    });
  }

  async function handleGHDiff(baseSha: string, headSha: string) {
    setGhSubTab("diff");
    startTransition(async () => {
      try {
        const result = await getGitHubDiff(playgroundId, baseSha, headSha);
        setGhDiffs(result.files);
      } catch (e: unknown) {
        flash(
          setGhFeedback,
          `✗ ${e instanceof Error ? e.message : "Failed to load diff"}`,
        );
      }
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-[#080e13] text-[#c9d4e5]",
        className,
      )}
    >
      {/* Header */}
      <div className="border-b border-[#1e2028] px-3 py-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00d4aa]">
          Git
        </div>
        <p className="text-[11px] text-[#6a7280]">
          Commit locally or push/pull with GitHub.
        </p>
      </div>

      {/* Top-level tab switcher */}
      <div className="flex items-center gap-1 border-b border-[#1e2028] px-2 py-2">
        {(
          [
            { key: "local" as const, icon: GitBranch, label: "Local" },
            { key: "github" as const, icon: Github, label: "GitHub" },
          ] as const
        ).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] transition-colors
              ${
                tab === key
                  ? "border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] text-[#7ae8cc]"
                  : "border border-transparent text-[#8ea5b5] hover:border-[#1e2028] hover:bg-[#11161d] hover:text-white"
              }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}

        {/* Linked repo badge */}
        {linkedRepo && (
          <span className="ml-auto flex items-center gap-1 truncate rounded-full border border-[#0f4d40] bg-[rgba(0,212,170,0.08)] px-2 py-0.5 text-[10px] text-[#7ae8cc]">
            <Check className="h-2.5 w-2.5" />
            <span className="max-w-[100px] truncate">{linkedRepo}</span>
          </span>
        )}
      </div>

      {/* ── LOCAL TAB ─────────────────────────────────────────────────────── */}
      {tab === "local" && (
        <>
          <div className="flex items-center gap-1 border-b border-[#1e2028] px-2 py-1.5">
            {(["commit", "log", "diff"] as const).map((t) => (
              <button
                key={t}
                onClick={
                  t === "log" ? handleOpenLocalLog : () => setLocalSubTab(t)
                }
                className={`rounded-md px-2.5 py-1 text-[11px] capitalize transition-colors
                  ${
                    localSubTab === t
                      ? "border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] text-[#7ae8cc]"
                      : "border border-transparent text-[#8ea5b5] hover:border-[#1e2028] hover:bg-[#11161d] hover:text-white"
                  }`}
              >
                {t === "commit" ? "Stage" : t === "log" ? "History" : "Diff"}
              </button>
            ))}
          </div>

          {localSubTab === "commit" && (
            <div className="flex flex-col gap-3 p-3">
              <p className="text-xs text-[#8ea5b5]">
                Snapshot the current state of your playground files locally.
              </p>
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe this snapshot…"
                onKeyDown={(e) => e.key === "Enter" && handleLocalCommit()}
                className="border-[#1e2028] bg-[#0f141b] text-white placeholder:text-[#6a7280]"
              />
              <button
                onClick={handleLocalCommit}
                disabled={isPending || !commitMessage.trim()}
                className="inline-flex h-8 items-center justify-center rounded-md border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] px-3 text-xs font-medium text-[#7ae8cc] transition-colors hover:bg-[rgba(0,212,170,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Committing…" : "Commit"}
              </button>
              {localFeedback && (
                <p className="text-xs text-[#8ea5b5]">{localFeedback}</p>
              )}
            </div>
          )}

          {localSubTab === "log" && (
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-2 p-2">
                {isPending && (
                  <p className="p-2 text-xs text-[#8ea5b5]">Loading…</p>
                )}
                {!isPending && localLog.length === 0 && (
                  <p className="p-2 text-xs text-[#8ea5b5]">No commits yet.</p>
                )}
                {localLog.map((commit) => (
                  <div
                    key={commit.id}
                    className="group rounded-lg border border-[#1e2028] bg-[#0f141b] p-2.5 transition-colors hover:border-[#00d4aa]/30"
                  >
                    <p className="truncate text-sm font-medium text-[#d6e1ef]">
                      {commit.message}
                    </p>
                    <p className="text-xs text-[#6a7280]">
                      {commit.author.name ?? "Unknown"} ·{" "}
                      {formatDistanceToNow(new Date(commit.createdAt))} ago
                    </p>
                    <div className="mt-2 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={() => handleLocalViewDiff(commit.id)}
                        className="rounded border border-[#1e2028] bg-[#11161d] px-2 py-1 text-[10px] text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                      >
                        View diff
                      </button>
                      <button
                        onClick={() => handleLocalRestore(commit.id)}
                        className="rounded border border-[#ff6b6b]/25 bg-[rgba(255,107,107,0.08)] px-2 py-1 text-[10px] text-[#ff8b8b] transition-colors hover:border-[#ff6b6b]/50 hover:bg-[rgba(255,107,107,0.14)]"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {localSubTab === "diff" && (
            <ScrollArea className="flex-1">
              <div className="p-2 font-mono text-xs">
                {selectedLocalCommit && (
                  <div className="mb-2 rounded-md border border-[#1e2028] bg-[#0f141b] px-2 py-1 text-[10px] text-[#6a7280]">
                    Comparing commit snapshot against your live workspace.
                  </div>
                )}
                {isPending && (
                  <p className="text-[#8ea5b5]">Computing diff…</p>
                )}
                {!isPending && localDiffs.length === 0 && (
                  <p className="text-[#8ea5b5]">
                    No changes from this commit to now.
                  </p>
                )}
                {localDiffs.map((file) => (
                  <div key={file.filename} className="mb-4">
                    <p className="mb-1 text-sm font-semibold text-[#d6e1ef]">
                      {file.filename}
                      <span className="ml-2 text-green-500">
                        +{file.added}
                      </span>
                      <span className="ml-1 text-red-500">
                        -{file.removed}
                      </span>
                    </p>
                    {file.lines.map((line, i) => (
                      <div
                        key={i}
                        className={`whitespace-pre-wrap px-2 py-0.5 leading-tight ${
                          line.type === "added"
                            ? "bg-[rgba(0,212,170,0.08)] text-[#7ae8cc]"
                            : line.type === "removed"
                              ? "bg-[rgba(255,107,107,0.08)] text-[#ff8b8b]"
                              : "text-[#8ea5b5]"
                        }`}
                      >
                        {line.type === "added"
                          ? "+ "
                          : line.type === "removed"
                            ? "- "
                            : "  "}
                        {line.content}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}

      {/* ── GITHUB TAB ────────────────────────────────────────────────────── */}
      {tab === "github" && (
        <>
          <div className="flex items-center gap-1 border-b border-[#1e2028] px-2 py-1.5">
            {(
              [
                { key: "repo" as const, icon: Link2, label: "Repo" },
                { key: "push" as const, icon: Upload, label: "Push/Pull" },
                {
                  key: "history" as const,
                  icon: History,
                  label: "History",
                },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={
                  key === "history" ? handleLoadGHHistory : () => setGhSubTab(key)
                }
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors
                  ${
                    ghSubTab === key
                      ? "border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] text-[#7ae8cc]"
                      : "border border-transparent text-[#8ea5b5] hover:border-[#1e2028] hover:bg-[#11161d] hover:text-white"
                  }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Shared feedback bar */}
          {ghFeedback && (
            <div className="border-b border-[#1e2028] px-3 py-1.5 text-xs text-[#8ea5b5]">
              {ghFeedback}
            </div>
          )}

          {/* ── REPO sub-tab ─────────────────────────────────────────────── */}
          {ghSubTab === "repo" && (
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-3 p-3">
                {/* Currently linked */}
                {linkedRepo ? (
                  <div className="rounded-lg border border-[#0f4d40] bg-[rgba(0,212,170,0.06)] p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#7ae8cc]">
                        Linked repo
                      </span>
                      <button
                        onClick={handleUnlink}
                        className="flex items-center gap-1 text-[10px] text-[#ff8b8b] hover:text-[#ff6b6b]"
                      >
                        <Link2Off className="h-3 w-3" />
                        Unlink
                      </button>
                    </div>
                    <p className="font-mono text-xs text-[#d6e1ef]">
                      {linkedRepo}
                    </p>
                    <p className="text-[10px] text-[#6a7280]">
                      branch: {linkedBranch}
                    </p>
                    <a
                      href={`https://github.com/${linkedRepo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-[#8ea5b5] hover:text-[#7ae8cc]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open on GitHub
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-[#6a7280]">
                    No repo linked. Link an existing repo or create a new one.
                  </p>
                )}

                {/* Link existing repo */}
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium text-[#8ea5b5]">
                    Link existing repo
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLoadRepos}
                      disabled={isPending}
                      className="flex items-center gap-1 rounded border border-[#1e2028] bg-[#0f141b] px-2 py-1 text-[10px] text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white disabled:opacity-50"
                    >
                      <RefreshCw
                        className={cn(
                          "h-3 w-3",
                          isPending && "animate-spin",
                        )}
                      />
                      Load repos
                    </button>
                  </div>

                  {userRepos.length > 0 && (
                    <div className="flex gap-2">
                      <Select
                        value={selectedRepo}
                        onValueChange={setSelectedRepo}
                      >
                        <SelectTrigger className="flex-1 border-[#1e2028] bg-[#0f141b] text-xs text-white">
                          <SelectValue placeholder="Select a repo…" />
                        </SelectTrigger>
                        <SelectContent className="border-[#1e2028] bg-[#0f141b] text-white">
                          {userRepos.map((r) => (
                            <SelectItem
                              key={r.full_name}
                              value={r.full_name}
                              className="text-xs"
                            >
                              {r.full_name}
                              {r.private ? " 🔒" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={handleLinkExisting}
                        disabled={!selectedRepo || isPending}
                        className="rounded border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] px-2.5 text-[11px] text-[#7ae8cc] transition-colors hover:bg-[rgba(0,212,170,0.18)] disabled:opacity-50"
                      >
                        Link
                      </button>
                    </div>
                  )}
                </div>

                {/* Create new repo */}
                <Collapsible
                  open={showCreateRepo}
                  onOpenChange={setShowCreateRepo}
                >
                  <CollapsibleTrigger className="flex w-full items-center gap-1.5 text-[11px] font-medium text-[#8ea5b5] hover:text-white">
                    <Plus className="h-3 w-3" />
                    Create new repo
                    <ChevronDown
                      className={cn(
                        "ml-auto h-3 w-3 transition-transform",
                        showCreateRepo && "rotate-180",
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 flex flex-col gap-2">
                    <Input
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="Repository name"
                      className="border-[#1e2028] bg-[#0f141b] text-white placeholder:text-[#6a7280]"
                    />
                    <label className="flex items-center gap-2 text-xs text-[#8ea5b5]">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="accent-[#00d4aa]"
                      />
                      Private repo
                    </label>
                    <button
                      onClick={handleCreateAndLink}
                      disabled={!newRepoName.trim() || isPending}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] px-3 text-xs font-medium text-[#7ae8cc] transition-colors hover:bg-[rgba(0,212,170,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? "Creating…" : "Create & Link"}
                    </button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          )}

          {/* ── PUSH / PULL sub-tab ──────────────────────────────────────── */}
          {ghSubTab === "push" && (
            <div className="flex flex-col gap-3 p-3">
              {!linkedRepo && (
                <div className="rounded-md border border-[#ff6b6b]/25 bg-[rgba(255,107,107,0.06)] px-3 py-2 text-xs text-[#ff8b8b]">
                  Link a GitHub repo first (Repo tab).
                </div>
              )}

              {linkedRepo && (
                <>
                  <div className="rounded-md border border-[#1e2028] bg-[#0f141b] px-2 py-1.5 text-[10px] text-[#6a7280]">
                    Pushing to{" "}
                    <span className="text-[#7ae8cc]">{linkedRepo}</span> /{" "}
                    {linkedBranch}
                  </div>

                  {/* Push */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-medium text-[#8ea5b5]">
                      Push to GitHub
                    </p>
                    <Input
                      value={pushMessage}
                      onChange={(e) => setPushMessage(e.target.value)}
                      placeholder="Commit message…"
                      onKeyDown={(e) => e.key === "Enter" && handlePush()}
                      className="border-[#1e2028] bg-[#0f141b] text-white placeholder:text-[#6a7280]"
                    />
                    <button
                      onClick={handlePush}
                      disabled={isPending || !pushMessage.trim()}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] px-3 text-xs font-medium text-[#7ae8cc] transition-colors hover:bg-[rgba(0,212,170,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload className="h-3 w-3" />
                      {isPending ? "Pushing…" : "Push"}
                    </button>
                  </div>

                  <div className="border-t border-[#1e2028]" />

                  {/* Pull */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-medium text-[#8ea5b5]">
                      Pull from GitHub
                    </p>
                    <p className="text-[10px] text-[#6a7280]">
                      Downloads all files from the linked repo and overwrites
                      your current playground.
                    </p>
                    <button
                      onClick={handlePull}
                      disabled={isPending}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#1e2028] bg-[#0f141b] px-3 text-xs font-medium text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-3 w-3" />
                      {isPending ? "Pulling…" : "Pull"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── HISTORY sub-tab ──────────────────────────────────────────── */}
          {ghSubTab === "history" && (
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-2 p-2">
                {isPending && (
                  <p className="p-2 text-xs text-[#8ea5b5]">Loading…</p>
                )}
                {!isPending && ghHistory.length === 0 && !linkedRepo && (
                  <p className="p-2 text-xs text-[#8ea5b5]">
                    Link a repo first.
                  </p>
                )}
                {!isPending && ghHistory.length === 0 && linkedRepo && (
                  <p className="p-2 text-xs text-[#8ea5b5]">
                    No commits found.
                  </p>
                )}
                {ghHistory.map((commit, index) => (
                  <div
                    key={commit.sha}
                    className="group rounded-lg border border-[#1e2028] bg-[#0f141b] p-2.5 transition-colors hover:border-[#00d4aa]/30"
                  >
                    <p className="truncate text-sm font-medium text-[#d6e1ef]">
                      {commit.commit.message.split("\n")[0]}
                    </p>
                    <p className="font-mono text-[10px] text-[#6a7280]">
                      {commit.sha.slice(0, 7)} ·{" "}
                      {commit.commit.author.name} ·{" "}
                      {formatDistanceToNow(
                        new Date(commit.commit.author.date),
                      )}{" "}
                      ago
                    </p>
                    <div className="mt-2 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      {index < ghHistory.length - 1 && (
                        <button
                          onClick={() =>
                            handleGHDiff(
                              ghHistory[index + 1].sha,
                              commit.sha,
                            )
                          }
                          className="rounded border border-[#1e2028] bg-[#11161d] px-2 py-1 text-[10px] text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                        >
                          View diff
                        </button>
                      )}
                      <a
                        href={commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded border border-[#1e2028] bg-[#11161d] px-2 py-1 text-[10px] text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        GitHub
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* ── DIFF sub-tab ─────────────────────────────────────────────── */}
          {ghSubTab === "diff" && (
            <ScrollArea className="flex-1">
              <div className="p-2 font-mono text-xs">
                {isPending && (
                  <p className="text-[#8ea5b5]">Loading diff…</p>
                )}
                {!isPending && ghDiffs.length === 0 && (
                  <p className="text-[#8ea5b5]">
                    Select "View diff" from a commit in History.
                  </p>
                )}
                {ghDiffs.map((file) => (
                  <div key={file.filename} className="mb-4">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#d6e1ef]">
                        {file.filename}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                          file.status === "added"
                            ? "bg-green-500/15 text-green-400"
                            : file.status === "removed"
                              ? "bg-red-500/15 text-red-400"
                              : file.status === "renamed"
                                ? "bg-blue-500/15 text-blue-400"
                                : "bg-yellow-500/15 text-yellow-400",
                        )}
                      >
                        {file.status}
                      </span>
                      <span className="text-[10px] text-green-500">
                        +{file.additions}
                      </span>
                      <span className="text-[10px] text-red-500">
                        -{file.deletions}
                      </span>
                    </div>
                    {file.patch ? (
                      file.patch.split("\n").map((line, i) => (
                        <div
                          key={i}
                          className={`whitespace-pre px-2 py-0.5 text-xs leading-tight ${
                            line.startsWith("+") && !line.startsWith("+++")
                              ? "bg-green-500/10 text-green-500"
                              : line.startsWith("-") && !line.startsWith("---")
                                ? "bg-red-500/10 text-red-500"
                                : line.startsWith("@@")
                                  ? "text-blue-400"
                                  : "text-[#8ea5b5]"
                          }`}
                        >
                          {line}
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-[#6a7280]">
                        Binary file or no patch available.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
