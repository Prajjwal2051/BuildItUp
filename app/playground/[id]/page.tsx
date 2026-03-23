"use client"
import React from 'react'
import { useParams } from 'next/navigation'
import usePlayground from '@/modules/playground/hooks/usePlayground'

// This page is the main entry point for a specific playground, identified by its ID in the URL. It retrieves the ID from the URL parameters and can be used to fetch and display the corresponding playground data. Currently, it simply displays the ID for demonstration purposes.
function MainPlaygroundPage() {

    const params = useParams<{ id?: string | string[] }>()
    // Route params can be string or string[] depending on segment shape, so normalize before use.
    const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")
    const { playgroundData, templateData, isLoading, error, saveTemplateData } = usePlayground(id)
    console.log("templateData", templateData)
    console.log("playgroundData", playgroundData)

    return (
        <div>
            Params: {id}
        </div>
    )
}

export default MainPlaygroundPage