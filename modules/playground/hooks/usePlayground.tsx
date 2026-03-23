// This file defines a custom React hook called `usePlayground` that manages the state and logic for a playground feature in a web application. The hook provides functionality to load playground data, save template data, and handle loading and error states. It uses TypeScript for type safety and the `sonner` library for displaying toast notifications.

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import type { FileTreeNode } from "../lib/path-to-json"

// Options for the pathToJson function, which converts a file or folder path into a JSON tree. These options allow you to include file content, set a maximum depth for recursion, specify the encoding for reading files, and define patterns to ignore certain files or directories.
interface PlaygroundData {
    id: string
    name?: string
    [key: string]: any

}
// The return type of the `usePlayground` hook, which includes the playground data, template data, loading state, error message, and functions to load the playground and save template data. This interface helps to ensure that the hook's return value is consistent and type-safe.
interface UsePlaygroundReturn {
    playgroundData: PlaygroundData | null
    templateData: FileTreeNode | null
    isLoading: boolean
    error: string | null
    loadPlayground: () => Promise<void>
    saveTemplateData: (data: FileTreeNode) => Promise<void>
}

function usePlayground(playgroundId: string): UsePlaygroundReturn {
    const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null)
    const [templateData, setTemplateData] = useState<FileTreeNode | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadPlayground = useCallback(async () => {
        // This function loads the playground data from the server using the provided playground ID. It sets the loading state to true, clears any previous errors, and makes a fetch request to the API endpoint for the playground. If the response is successful, it updates the playground data and template data in the state. If there is an error during the fetch operation, it catches the error and updates the error state with an appropriate message. Finally, it sets the loading state back to false regardless of the outcome.
        if (!playgroundId) {
            setError("No playground ID provided")
            return
        }
        try {
            setIsLoading(true)
            setError(null)
            const response = await fetch(`/api/playground/${playgroundId}`)
            if (!response.ok) {
                const message = await response.text()
                throw new Error(message || "Failed to fetch playground data")
            }
            const data = await response.json()
            setPlaygroundData(data)

            // Template can come from the playground payload or from the dedicated template endpoint.
            const templateFromPlayground = data.templateFile?.content ?? null
            if (templateFromPlayground) {
                setTemplateData(templateFromPlayground as FileTreeNode)
            } else if (typeof data.code === "string" && data.code.trim().length > 0) {
                // New playgrounds start from code snapshot, so parse it when templateFile is not created yet.
                try {
                    const parsedCodeTemplate = JSON.parse(data.code) as FileTreeNode
                    setTemplateData(parsedCodeTemplate)
                } catch {
                    setTemplateData(null)
                }
            } else {
                const templateResponse = await fetch(`/api/template/${playgroundId}`)
                if (templateResponse.ok) {
                    const templatePayload = await templateResponse.json()
                    const templateContent = templatePayload.content ?? null
                    if (typeof templateContent === "string") {
                        try {
                            setTemplateData(JSON.parse(templateContent) as FileTreeNode)
                        } catch {
                            setTemplateData(null)
                        }
                    } else {
                        setTemplateData(templateContent as FileTreeNode | null)
                    }
                } else {
                    setTemplateData(null)
                }
            }

            toast.success("Playground loaded successfully")
        } catch (error: any) {
            toast.error("Error loading playground")
            console.error("Error loading playground:", error)
            setPlaygroundData(null)
            setError(error.message || "An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }, [playgroundId])

    // This function saves the updated template data for a specific playground. It takes the playground ID and the new template data as parameters, and it updates the corresponding template file in the database. If the playground does not exist, it can create a new entry. This action allows the client to persist changes made to the playground's template data.
    const saveTemplateData = useCallback(async (data: FileTreeNode) => {
        if (!playgroundId) {
            setError("No playground ID provided")
            return
        }

        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch(`/api/template/${playgroundId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content: data }),
            })

            if (!response.ok) {
                throw new Error("Failed to save template data")
            }

            setTemplateData(data)
            toast.success("Template saved successfully")
        } catch (error: any) {
            toast.error("Error saving template")
            console.error("Error saving template:", error)
            setError(error.message || "An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }, [playgroundId])

    // Auto-load once the hook receives a valid playground id.
    useEffect(() => {
        if (playgroundId) {
            void loadPlayground()
        }
    }, [playgroundId, loadPlayground])

    return {
        playgroundData,
        templateData,
        isLoading,
        error,
        loadPlayground,
        saveTemplateData,
    }
}

export default usePlayground