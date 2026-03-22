import React from 'react'
import AddNewButton from '@/modules/dashboard/components/add-new-button'
import AddRepoButton from '@/modules/dashboard/components/add-new-repo'
import EmptyState from '@/modules/dashboard/components/empty-state'
import { getAllPlaygroundForUser } from '@/modules/dashboard/actions'
import ProjectTable from '@/modules/dashboard/components/project-table'
import ProjectSearch from '@/modules/dashboard/components/project-search'
import ThemeToggle from '@/components/theme-toggle'
import { currentUser } from '@/modules/auth/actions'

const Page = async () => {
    const playgrounds = await getAllPlaygroundForUser()
    const user = await currentUser()
    return (
        <div className='flex flex-col justify-start min-h-screen w-full px-4 py-10 md:px-6 lg:px-8'>
            <ProjectSearch projects={playgrounds || []} />
            <div className='fixed bottom-4 right-4 z-50'>
                <ThemeToggle />
            </div>
            <div className='fixed top-4 right-4 z-50 flex items-center gap-2'>
                <AddNewButton />
                <AddRepoButton />
            </div>
            <div className='mt-10 flex flex-col justify-center items-center w-full'>
                {
                    playgrounds && playgrounds.length === 0 ?
                        (<EmptyState />) :
                        (
                            <ProjectTable
                                projects={playgrounds || []}
                                currentUserName={user?.name || "Unknown User"}
                                currentUserImage={user?.image || null}
                            />
                        )
                }


            </div>

        </div>

    )
}

export default Page