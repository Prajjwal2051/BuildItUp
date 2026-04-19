"use client";

import { useState, useTransition } from "react";
import { createCommit, getCommitLog, getCommitSnapShot, retoreCommit } from "@/modules/git/actions";
import { diffSnapshots, FileDiff } from "@/lib/git-diff";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Commit = {
    id: string;
    message: string;
    createdAt: Date;
    author: { name: string | null; image: string | null };
};

type Props = {
    playgroundId: string;
    currentSnapshot: Record<string, string>; // current live files
    className?: string;
};

export function GitPanel({ playgroundId, currentSnapshot, className }: Props) {
    const [tab, setTab] = useState<"commit" | "log" | "diff">("commit");
    const [message, setMessage] = useState("");
    const [log, setLog] = useState<Commit[]>([]);
    const [diffs, setDiffs] = useState<FileDiff[]>([]);
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState("");

    // ── Commit current state ─────────────────────────────────────
    function handleCommit() {
        if (!message.trim()) return;
        startTransition(async () => {
            try {
                await createCommit(playgroundId, message.trim());
                setMessage("");
                setFeedback("✓ Committed successfully");
                setTimeout(() => setFeedback(""), 3000);
            } catch {
                setFeedback("✗ Commit failed");
            }
        });
    }

    // ── Load commit log ──────────────────────────────────────────
    function handleOpenLog() {
        setTab("log");
        startTransition(async () => {
            const commits = await getCommitLog(playgroundId);
            setLog(commits as Commit[]);
        });
    }

    // ── Show diff of selected commit vs current ──────────────────
    async function handleViewDiff(commitId: string) {
        setSelectedCommit(commitId);
        setTab("diff");
        startTransition(async () => {
            const { snapshot } = await getCommitSnapShot(commitId);
            const oldSnap = snapshot as Record<string, string>;
            const fileDiffs = diffSnapshots(oldSnap, currentSnapshot);
            setDiffs(fileDiffs);
        });
    }

    // ── Restore a past commit ────────────────────────────────────
    function handleRestore(commitId: string) {
        if (!confirm("Restore this commit? Your current changes will be overwritten.")) return;
        startTransition(async () => {
            await retoreCommit(playgroundId, commitId);
            setFeedback("✓ Restored to selected commit");
            setTimeout(() => setFeedback(""), 3000);
        });
    }

    return (
        <div
            className={cn(
                "flex h-full min-h-0 flex-col overflow-hidden bg-[#080e13] text-[#c9d4e5]",
                className,
            )}
        >
            <div className="border-b border-[#1e2028] px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00d4aa]">
                    Git
                </div>
                <p className="text-[11px] text-[#6a7280]">
                    Commit, inspect, and restore playground snapshots.
                </p>
            </div>

            <div className="flex items-center gap-1 border-b border-[#1e2028] px-2 py-2">
                {(["commit", "log", "diff"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={t === "log" ? handleOpenLog : () => setTab(t)}
                        className={`rounded-md px-2.5 py-1 text-[11px] capitalize transition-colors
              ${tab === t
                                ? "border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] text-[#7ae8cc]"
                                : "border border-transparent text-[#8ea5b5] hover:border-[#1e2028] hover:bg-[#11161d] hover:text-white"}`}
                    >
                        {t === "commit" ? "Stage" : t === "log" ? "History" : "Diff"}
                    </button>
                ))}
            </div>

            {tab === "commit" && (
                <div className="flex flex-col gap-3 p-3">
                    <p className="text-xs text-[#8ea5b5]">
                        Snapshot the current state of your playground files.
                    </p>
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe this snapshot..."
                        onKeyDown={(e) => e.key === "Enter" && handleCommit()}
                        className="border-[#1e2028] bg-[#0f141b] text-white placeholder:text-[#6a7280]"
                    />
                    <button
                        onClick={handleCommit}
                        disabled={isPending || !message.trim()}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-[#0f4d40] bg-[rgba(0,212,170,0.12)] px-3 text-xs font-medium text-[#7ae8cc] transition-colors hover:bg-[rgba(0,212,170,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending ? "Committing…" : "Commit"}
                    </button>
                    {feedback && (
                        <p className="text-xs text-[#8ea5b5]">{feedback}</p>
                    )}
                </div>
            )}

            {tab === "log" && (
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-2 p-2">
                        {isPending && <p className="p-2 text-xs text-[#8ea5b5]">Loading…</p>}
                        {!isPending && log.length === 0 && (
                            <p className="p-2 text-xs text-[#8ea5b5]">No commits yet.</p>
                        )}
                        {log.map((commit) => (
                            <div
                                key={commit.id}
                                className="group rounded-lg border border-[#1e2028] bg-[#0f141b] p-2.5 transition-colors hover:border-[#00d4aa]/30"
                            >
                                <p className="truncate text-sm font-medium text-[#d6e1ef]">{commit.message}</p>
                                <p className="text-xs text-[#6a7280]">
                                    {commit.author.name ?? "Unknown"} · {formatDistanceToNow(new Date(commit.createdAt))} ago
                                </p>
                                <div className="mt-2 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                    <button
                                        onClick={() => handleViewDiff(commit.id)}
                                        className="rounded border border-[#1e2028] bg-[#11161d] px-2 py-1 text-[10px] text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                                    >
                                        View diff
                                    </button>
                                    <button
                                        onClick={() => handleRestore(commit.id)}
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

            {tab === "diff" && (
                <ScrollArea className="flex-1">
                    <div className="p-2 font-mono text-xs">
                        {selectedCommit ? (
                            <div className="mb-2 rounded-md border border-[#1e2028] bg-[#0f141b] px-2 py-1 text-[10px] text-[#6a7280]">
                                Comparing commit snapshot against your live workspace.
                            </div>
                        ) : null}
                        {isPending && <p className="text-[#8ea5b5]">Computing diff…</p>}
                        {!isPending && diffs.length === 0 && (
                            <p className="text-[#8ea5b5]">No changes from this commit to now.</p>
                        )}
                        {diffs.map((file) => (
                            <div key={file.filename} className="mb-4">
                                <p className="mb-1 text-sm font-semibold text-[#d6e1ef]">
                                    {file.filename}
                                    <span className="ml-2 text-green-500">+{file.added}</span>
                                    <span className="ml-1 text-red-500">-{file.removed}</span>
                                </p>
                                {file.lines.map((line, i) => (
                                    <div
                                        key={i}
                                        className={`px-2 py-0.5 whitespace-pre-wrap leading-tight ${line.type === "added"
                                            ? "bg-[rgba(0,212,170,0.08)] text-[#7ae8cc]"
                                            : line.type === "removed"
                                                ? "bg-[rgba(255,107,107,0.08)] text-[#ff8b8b]"
                                                : "text-[#8ea5b5]"
                                            }`}
                                    >
                                        {line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}
                                        {line.content}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
