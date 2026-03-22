import React from 'react'
import { useParams } from 'next/navigation'

function MainPlaygroundPage() {

    const { id } = useParams<{ id: string }>()


    return (
        <div>
            Params: {id}
        </div>
    )
}

export default MainPlaygroundPage