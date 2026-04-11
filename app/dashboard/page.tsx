import React from 'react'
import AddNewButton from '@/modules/dashboard/components/add-new-button'
import AddRepoButton from '@/modules/dashboard/components/add-new-repo'
import EmptyState from '@/modules/dashboard/components/empty-state'
import { getAllPlaygroundForUser } from '@/modules/dashboard/actions'
import ProjectTable from '@/modules/dashboard/components/project-table'
import ProjectSearch from '@/modules/dashboard/components/project-search'
import LogoutButton from '@/modules/auth/components/logout-button'
import { currentUser } from '@/modules/auth/actions'

const Page = async () => {
    const playgrounds = await getAllPlaygroundForUser()
    const user = await currentUser()
    return (
        <div className="relative flex min-h-screen w-full flex-col gap-6 px-8 py-6 md:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 reveal-up [animation-delay:80ms]">
                <ProjectSearch projects={playgrounds || []} className="flex-1" />
                <div className="flex shrink-0 items-center gap-4 reveal-up [animation-delay:180ms]">
                    <AddNewButton />
                    <AddRepoButton />
                </div>
            </div>

            <div className="reveal-up [animation-delay:260ms]">
                {playgrounds && playgrounds.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ProjectTable
                        projects={playgrounds || []}
                        currentUserName={user?.name || 'Unknown User'}
                        currentUserImage={user?.image || null}
                    />
                )}
            </div>

            <LogoutButton className="fixed right-6 bottom-6 z-50 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-background">
                Logout
            </LogoutButton>
        </div>
    )
}

export default Page
