"use client"
import React from 'react'
import { useParams } from 'next/navigation'
import usePlayground from '@/modules/playground/hooks/usePlayground'
import { Separator } from '@base-ui/react'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'

// This page is the main entry point for a specific playground, identified by its ID in the URL. It retrieves the ID from the URL parameters and can be used to fetch and display the corresponding playground data. Currently, it simply displays the ID for demonstration purposes.
function MainPlaygroundPage() {

    const params = useParams<{ id?: string | string[] }>()
    // Route params can be string or string[] depending on segment shape, so normalize before use.
    const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")
    const { playgroundData, templateData, isLoading, error, saveTemplateData } = usePlayground(id)
    //console.log("templateData", templateData)
    //console.log("playgroundData", playgroundData)

    const activeFile = "sample.txt"

    return (
        <div>
            <TemplateFileTree 
                data={templateData}
                onFileSelect={()=>{}}
                selectedFile={activeFile}
                title="File Explorer"
                onAddFile={()=>{}}
                onAddFolder={()=>{}}
                onDeleteFile={()=>{}}
                onDeleteFolder={()=>{}}
                onRenameFile={()=>{}}
                onRenameFolder={()=>{}}
            
            />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation='vertical' className="mr-2 h-6" />
                    <h1 className="text-sm font-medium">Playground: {id}</h1>
                </header>
                <div className='flex flex-1 items-center gap-2'>
                    <div className='flex flex-col flex-1'></div>
                    <h1 className='text-sm font-medium'>
                        {playgroundData?.title || "Loading..."}
                    </h1>
                </div>
            </SidebarInset>
        </div>
    )
}

export default MainPlaygroundPage