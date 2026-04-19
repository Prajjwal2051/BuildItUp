// This custom hook initializes a WebContainer instance and provides functions to interact with it, such as writing files and destroying the instance.

import { useState, useEffect, useCallback } from 'react'
import { WebContainer } from '@webcontainer/api'
import { TemplateFolder } from '@/modules/playground/lib/path-to-json'

const BOOT_TIMEOUT_MS = 20_000

interface UseWebContainerProps {
    templateData: typeof TemplateFolder | null
}

interface UseWebContainerReturn {
    serverUrl: string | null
    isLoading: boolean
    error: Error | null
    instance: WebContainer | null
    useWriteFileSync: (path: string, content: string) => Promise<void> // Add the useWriteFileSync function to the return type
    destroy: () => void // Add the destroy function to the return type
}

let sharedWebContainerInstance: WebContainer | null = null
let sharedWebContainerBootPromise: Promise<WebContainer> | null = null

async function bootWithTimeout(): Promise<WebContainer> {
    return Promise.race([
        WebContainer.boot(),
        new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`WebContainer boot timed out after ${BOOT_TIMEOUT_MS / 1000}s`))
            }, BOOT_TIMEOUT_MS)
        }),
    ])
}

// Boots a single shared WebContainer so strict-mode remounts do not create duplicate instances.
async function getOrBootWebContainer(): Promise<WebContainer> {
    if (sharedWebContainerInstance) {
        return sharedWebContainerInstance
    }

    if (!sharedWebContainerBootPromise) {
        sharedWebContainerBootPromise = bootWithTimeout()
            .then((instance) => {
                sharedWebContainerInstance = instance
                return instance
            })
            .catch((error) => {
                sharedWebContainerBootPromise = null
                throw error
            })
    }

    return sharedWebContainerBootPromise
}

const useWebContainer = ({ templateData }: UseWebContainerProps): UseWebContainerReturn => {
    const [serverUrl, setServerUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<Error | null>(null)
    const [instance, setInstance] = useState<WebContainer | null>(null)
    const [retryCount, setRetryCount] = useState(0)

    // Keep this reference so future template-driven boot logic can be added without changing the hook API.
    void templateData

    const bootInstance = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const webContainerInstance = await getOrBootWebContainer()
            setInstance(webContainerInstance)
        } catch (error) {
            setInstance(null)
            setError(error as Error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        // Initializes or reuses the shared WebContainer instance on mount.
        let mounted = true
        async function initializeWebContainer() {
            setIsLoading(true)
            setError(null)
            try {
                const webContainerInstance = await getOrBootWebContainer()
                if (!mounted) return
                setInstance(webContainerInstance)
            } catch (error) {
                if (!mounted) return
                setInstance(null)
                setError(error as Error)
            } finally {
                if (!mounted) return
                setIsLoading(false)
            }
        }
        initializeWebContainer()
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        if (instance || isLoading) return
        if (retryCount >= 3) return

        setRetryCount((previous) => previous + 1)
        void bootInstance()
    }, [bootInstance, instance, isLoading, retryCount])

    // Tracks server-ready events so consumers can open or embed live preview URLs.
    useEffect(() => {
        if (!instance) {
            setServerUrl(null)
            return
        }

        const maybeUnsubscribe = instance.on('server-ready', (_port, url) => {
            setServerUrl(url)
        })

        return () => {
            if (typeof maybeUnsubscribe === 'function') {
                maybeUnsubscribe()
            }
        }
    }, [instance])

    // Function to write a file in the WebContainer instance
    const writeFileSync = useCallback(
        async (path: string, content: string): Promise<void> => {
            if (!instance) {
                throw new Error('WebContainer instance is not initialized')
            }

            try {
                const pathParts = path.split('/').filter(Boolean) // Split the path and filter out empty parts
                const folderPath = pathParts.slice(0, -1).join('/') // Get the folder path by removing the last part (file name)

                if (folderPath) {
                    await instance.fs.mkdir(folderPath, { recursive: true }) // Create the folder if it doesn't exist
                }
                await instance.fs.writeFile(path, content) // Write the file with the provided content
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Failed to write file in WebContainer'
                console.error(errorMessage)
                throw new Error(errorMessage)
            }
        },
        [instance],
    )

    // Function to destroy the WebContainer instance
    const destroy = useCallback(() => {
        if (instance) {
            instance.teardown()
        }

        setInstance(null)
        setServerUrl(null)
        sharedWebContainerInstance = null
        sharedWebContainerBootPromise = null
        setRetryCount(0)

        // Reset action in UI should recover a fresh instance immediately.
        void bootInstance()
    }, [bootInstance, instance])
    return {
        serverUrl,
        isLoading,
        error,
        instance,
        useWriteFileSync: writeFileSync, // Return the useWriteFileSync function
        destroy, // Return the destroy function
    }
}

export default useWebContainer
