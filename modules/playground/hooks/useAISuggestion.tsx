// This file defines a custom React hook called `useAISuggestion` that manages the state and logic
// for AI suggestions in a playground editor. It simulates fetching suggestions based on user input
// and provides methods to accept, reject, or clear suggestions.

import { useState, useEffect, useCallback } from "react";

interface AISuggestion {
    id: string;
    text: string;
    isLoading?: boolean;
    position?: {
        line: number;
        column: number;
    };
    isEnabled?: boolean;
    decoration: string[];
}

interface UseAISuggestionReturn extends AISuggestion {
    toggleEnabled: () => void;
    fetchNewSuggestion: (input: string, editor?: any) => void;
    acceptSuggestion: (editor: any, monaco: any) => void;
    rejectSuggestion: (editor?: any) => void;
    clearSuggestion: () => void;
}

// Custom hook to fetch AI suggestions based on user input in the playground.
const useAISuggestion = (input: string): UseAISuggestionReturn => {
    const [suggestion, setSuggestion] = useState<AISuggestion>({
        id: "",
        text: "",
        decoration: [],
        isLoading: false,
    });
    const [isEnabled, setIsEnabled] = useState(true);

    // BUG FIX 1: Wrapped in useCallback to avoid stale closure issues in useEffect deps.
    const clearSuggestion = useCallback(() => {
        setSuggestion({
            id: "",
            text: "",
            decoration: [],
            isLoading: false,
        });
    }, []);

    // BUG FIX 2: Wrapped in useCallback so it can be safely listed in useEffect deps.
    const fetchNewSuggestion = useCallback(
        async (nextInput: string, editor?: any) => {
            if (!isEnabled || !nextInput.trim()) {
                clearSuggestion();
                return;
            }

            if (!editor) {
                clearSuggestion();
                return;
            }

            const model = editor.getModel?.();
            const position = editor.getPosition?.();

            if (!model || !position) {
                clearSuggestion();
                return;
            }

            setSuggestion((prev) => ({ ...prev, isLoading: true }));

            try {
                const payload = {
                    fileContent: model.getValue(),
                    cursorLine: position.lineNumber - 1,
                    cursorColumn: position.column - 1,
                    suggestionType: "code",
                };

                const response = await fetch("/api/ai/suggestion", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                const data = await response.json();

                setSuggestion({
                    id: data.id ?? "",
                    text: data.text ?? "",
                    decoration: data.decoration ?? [],
                    position: {
                        line: position.lineNumber,
                        column: position.column,
                    },
                    isLoading: false,
                });
            } catch (error) {
                console.error("Error fetching AI suggestion:", error);
                clearSuggestion();
            }
        },
        [isEnabled, clearSuggestion]
    );

    const toggleEnabled = useCallback(() => {
        setIsEnabled((prev) => {
            const next = !prev;
            if (!next) clearSuggestion();
            return next;
        });
    }, [clearSuggestion]);

    // BUG FIX 3: `acceptSuggestion` previously wrapped its entire body in an anonymous
    // arrow function that was never invoked, so it did nothing. It also incorrectly called
    // `useState(...)` as a state updater (useState is a hook, not a setter).
    // Fixed: accepts `editor` and `monaco` as parameters, uses `setSuggestion` correctly,
    // and reads the latest suggestion via a functional updater so it is never stale.
    const acceptSuggestion = useCallback(
        (editor: any, monaco: any) => {
            setSuggestion((currentSuggestion) => {
                if (
                    !currentSuggestion.position ||
                    !currentSuggestion.text ||
                    !editor ||
                    !monaco
                ) {
                    return currentSuggestion;
                }

                const { line, column } = currentSuggestion.position;
                const sanitizedText = currentSuggestion.text.replace(/\r/g, "");

                editor.executeEdits("ai-suggestion", [
                    {
                        range: new monaco.Range(line, column, line, column),
                        text: sanitizedText,
                        forceMoveMarkers: true,
                    },
                ]);

                if (currentSuggestion.decoration.length > 0) {
                    editor.deltaDecorations(currentSuggestion.decoration, []);
                }

                return {
                    ...currentSuggestion,
                    text: "",
                    decoration: [],
                };
            });
        },
        []
    );

    // BUG FIX 4: `rejectSuggestion` previously called `useState(...)` as though it were
    // a state-update function — this is invalid; useState is a hook and cannot be called
    // inside a regular callback. `editor` was also out of scope.
    // Fixed: uses `setSuggestion` with a functional updater, accepts optional `editor`
    // as a parameter, and clears decorations + suggestion text correctly.
    const rejectSuggestion = useCallback((editor?: any) => {
        setSuggestion((currentSuggestion) => {
            if (editor && currentSuggestion.decoration.length > 0) {
                editor.deltaDecorations(currentSuggestion.decoration, []);
            }

            return {
                ...currentSuggestion,
                text: "",
                decoration: [],
            };
        });
    }, []);

    // BUG FIX 5: Added `fetchNewSuggestion` to deps array (it is now stable via useCallback).
    // Previously omitting it caused a stale-closure lint warning and potential runtime bugs.
    useEffect(() => {
        fetchNewSuggestion(input);
    }, [input, isEnabled, fetchNewSuggestion]);

    return {
        ...suggestion,
        isEnabled,
        toggleEnabled,
        fetchNewSuggestion,
        acceptSuggestion,
        rejectSuggestion,
        clearSuggestion,
    };
};

export default useAISuggestion;