// This custom hook initializes a WebContainer instance and provides functions to interact with it, such as writing files and destroying the instance.

import { useState, useEffect, useCallback } from "react"
import { WebContainer } from "@webcontainer/api"
import { TemplateFolder } from "@/modules/playground/lib/path-to-json"

interface UseWebContainerProps {
    templateData: typeof TemplateFolder | null

}

interface UseWebContainerReturn {
    serverUrl: string | null
    isLoading: boolean
    error: Error | null
    instance: WebContainer | nul
    useWriteFileSync: (path: string, content: string) => Promise<void>    // Add the useWriteFileSync function to the return type
    destroy: () => void // Add the destroy function to the return type  


}

const useWebContainer= ({templateData}:UseWebContainerProps): UseWebContainerReturn => {
    const [serverUrl, setServerUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<Error | null>(null)
    const [instance, setInstance] = useState<WebContainer | null>(null)

    useEffect(()=>{
        // Initialize the WebContainer instance when the component mounts
        let mounted = true
        async function initializeWebContainer() {
            try {
                const WebContainerInstance = await WebContainer.boot()
                if(!mounted) return
                setInstance(WebContainerInstance);
                setIsLoading(false)
                               
            } catch (error) {
                setError(error as Error)
                setIsLoading(false)
            }
        }
        initializeWebContainer()
        return () => {
            mounted = false
            if(instance){
                instance.teardown()
            }
        }
    },[])

    // Function to write a file in the WebContainer instance
    const writeFileSync = useCallback(async (path: string, content: string):Promise<void> => {
        if (!instance) {
            throw new Error("WebContainer instance is not initialized")
        }

        try {
            const pathParts= path.split("/").filter(Boolean) // Split the path and filter out empty parts
            const folderPath=pathParts.slice(0, -1).join("/") // Get the folder path by removing the last part (file name)

            if(folderPath){
                await instance.fs.mkdir(folderPath, { recursive: true }) // Create the folder if it doesn't exist
            }
            await instance.fs.writeFile(path, content) // Write the file with the provided content

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to write file in WebContainer"
            console.error(errorMessage)
            throw new Error(errorMessage)
        }

    },[instance])        

    // Function to destroy the WebContainer instance
    const destroy= useCallback(()=>{
        if(instance){
            instance.teardown()
            setInstance(null)
            setServerUrl(null)
        }
    },[instance])
    return {
        serverUrl,
        isLoading,
        error,
        instance,
        useWriteFileSync: writeFileSync, // Return the useWriteFileSync function
        destroy // Return the destroy function      
    }
}

export default useWebContainer