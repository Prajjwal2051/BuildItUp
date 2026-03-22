"use client"
import React from 'react'
import { useParams } from 'next/navigation'

// This page is the main entry point for a specific playground, identified by its ID in the URL. It retrieves the ID from the URL parameters and can be used to fetch and display the corresponding playground data. Currently, it simply displays the ID for demonstration purposes.
function MainPlaygroundPage() {

    const { id } = useParams<{ id: string }>()


    return (
        <div>
            Params: {id}
        </div>
    )
}

export default MainPlaygroundPage