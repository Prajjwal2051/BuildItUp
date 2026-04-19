// this is the utility file that will be used to create a git diff between two snapshots of the playground
// it will be used to create a git commit and to render the git log / history list

// lib/git-diff.ts

export type DiffLine = {
    type: "added" | "removed" | "unchanged";
    content: string;
};

export type FileDiff = {
    filename: string;
    lines: DiffLine[];
    added: number;
    removed: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// MYERS DIFF — O((m+n)·D) time, O(m+n) space
// D = number of edits (insertions + deletions)
// For nearly-identical files (real code commits), D is tiny → extremely fast
// ─────────────────────────────────────────────────────────────────────────────

type Snake = { x: number; y: number; u: number; v: number };

function myersSnakes(a: string[], b: string[]): Snake[] {
    const N = a.length;
    const M = b.length;
    const MAX = N + M;

    if (MAX === 0) return [];

    // v[k + MAX] = furthest x-coordinate reached on diagonal k
    // Using Int32Array for performance (avoids JS object overhead)
    const v = new Int32Array(2 * MAX + 2);

    // Store a snapshot of v[] at every edit distance d for traceback
    const trace: Int32Array[] = [];

    for (let d = 0; d <= MAX; d++) {
        // Snapshot current frontier before modifying it
        trace.push(v.slice());

        for (let k = -d; k <= d; k += 2) {
            const ki = k + MAX;

            // Decide: move down (insert from b) or move right (delete from a)
            let x: number;
            if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
                x = v[ki + 1]; // came from diagonal k+1 → move down (y increases)
            } else {
                x = v[ki - 1] + 1; // came from diagonal k-1 → move right (x increases)
            }

            let y = x - k;

            // Extend snake: follow diagonal as long as lines match
            while (x < N && y < M && a[x] === b[y]) {
                x++;
                y++;
            }

            v[ki] = x;

            // Reached bottom-right corner → we have the shortest edit path
            if (x >= N && y >= M) {
                return traceback(a, b, trace, d, MAX);
            }
        }
    }

    return []; // unreachable for valid inputs
}

// ── Traceback ─────────────────────────────────────────────────────────────
// Walk backwards through the stored frontier snapshots to reconstruct
// the sequence of snakes (matching runs of lines).

function traceback(
    a: string[],
    b: string[],
    trace: Int32Array[],
    d: number,
    MAX: number
): Snake[] {
    const snakes: Snake[] = [];
    let x = a.length;
    let y = b.length;

    for (let depth = d; depth > 0; depth--) {
        const v = trace[depth];
        const k = x - y;
        const ki = k + MAX;

        // Determine which direction we originally moved at this depth
        const wentDown =
            k === -depth || (k !== depth && v[ki - 1] < v[ki + 1]);

        const prevK = wentDown ? k + 1 : k - 1;
        const prevKi = prevK + MAX;
        const prevX = v[prevKi];
        const prevY = prevX - prevK;

        // The snake starts right after the single edit move
        const snakeStartX = wentDown ? prevX : prevX + 1;
        const snakeStartY = wentDown ? prevY + 1 : prevY;

        // Only record the snake if it has length > 0
        if (x > snakeStartX || y > snakeStartY) {
            snakes.unshift({ x: snakeStartX, y: snakeStartY, u: x, v: y });
        }

        x = prevX;
        y = prevY;
    }

    return snakes;
}

// ── Build DiffLine[] from snakes ──────────────────────────────────────────
// Snakes are the matching (unchanged) regions.
// Gaps between snakes are the edits (added / removed).

function buildDiff(a: string[], b: string[], snakes: Snake[]): DiffLine[] {
    const result: DiffLine[] = [];
    let x = 0; // pointer into a (old lines)
    let y = 0; // pointer into b (new lines)

    for (const snake of snakes) {
        // Lines in a before this snake's x → removed
        while (x < snake.x) {
            result.push({ type: "removed", content: a[x++] });
        }
        // Lines in b before this snake's y → added
        while (y < snake.y) {
            result.push({ type: "added", content: b[y++] });
        }
        // The snake itself → unchanged (matching lines)
        while (x < snake.u) {
            result.push({ type: "unchanged", content: a[x++] });
            y++;
        }
    }

    // Any remaining lines after the last snake
    while (x < a.length) result.push({ type: "removed", content: a[x++] });
    while (y < b.length) result.push({ type: "added", content: b[y++] });

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export function diffLines(oldText: string, newText: string): DiffLine[] {
    // ── Fast paths ─────────────────────────────────────────────────────────
    if (oldText === newText) {
        return oldText === ""
            ? []
            : oldText.split("\n").map((content) => ({ type: "unchanged", content }));
    }

    const a = oldText === "" ? [] : oldText.split("\n");
    const b = newText === "" ? [] : newText.split("\n");

    if (a.length === 0) return b.map((content) => ({ type: "added", content }));
    if (b.length === 0) return a.map((content) => ({ type: "removed", content }));

    // ── Trim common prefix ─────────────────────────────────────────────────
    // Skip identical lines at the start — Myers never needs to see these
    let lo = 0;
    while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo++;

    // ── Trim common suffix ─────────────────────────────────────────────────
    let aHi = a.length;
    let bHi = b.length;
    while (aHi > lo && bHi > lo && a[aHi - 1] === b[bHi - 1]) {
        aHi--;
        bHi--;
    }

    // Slices that Myers actually needs to process (the changed middle section)
    const aMid = a.slice(lo, aHi);
    const bMid = b.slice(lo, bHi);

    // ── Build full diff ────────────────────────────────────────────────────
    const prefix = a.slice(0, lo).map((content) => ({ type: "unchanged" as const, content }));
    const suffix = a.slice(aHi).map((content) => ({ type: "unchanged" as const, content }));

    let mid: DiffLine[] = [];
    if (aMid.length > 0 || bMid.length > 0) {
        const snakes = myersSnakes(aMid, bMid);
        mid = buildDiff(aMid, bMid, snakes);
    }

    return [...prefix, ...mid, ...suffix];
}

// ── Compare two full TemplateFile.content snapshots ───────────────────────
// Each snapshot is Record<filename, fileContent as string>

function toDiffText(value: unknown): string {
    if (typeof value === "string") return value;
    if (value == null) return "";

    // Some snapshots store file entries as { content: "..." }.
    if (typeof value === "object" && "content" in value) {
        const content = (value as { content?: unknown }).content;
        return typeof content === "string" ? content : "";
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return "";
}

function normalizeSnapshot(snapshot: Record<string, unknown> | null | undefined): Record<string, string> {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
        return {};
    }

    const normalized: Record<string, string> = {};
    for (const [filename, value] of Object.entries(snapshot)) {
        normalized[filename] = toDiffText(value);
    }
    return normalized;
}

export function diffSnapshots(
    oldSnap: Record<string, unknown>,
    newSnap: Record<string, unknown>
): FileDiff[] {
    const normalizedOld = normalizeSnapshot(oldSnap);
    const normalizedNew = normalizeSnapshot(newSnap);

    const allFiles = new Set([...Object.keys(normalizedOld), ...Object.keys(normalizedNew)]);
    const diffs: FileDiff[] = [];

    for (const filename of allFiles) {
        const oldContent = normalizedOld[filename] ?? "";
        const newContent = normalizedNew[filename] ?? "";
        if (oldContent === newContent) continue;

        const lines = diffLines(oldContent, newContent);
        diffs.push({
            filename,
            lines,
            added: lines.filter((l) => l.type === "added").length,
            removed: lines.filter((l) => l.type === "removed").length,
        });
    }

    return diffs;
} 