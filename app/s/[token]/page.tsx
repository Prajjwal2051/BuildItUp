import { getSharedPlaygroundMeta } from '@/modules/playground/server/getSharedPlaygroundMeta'
import { PlaygroundViewer } from '@/modules/playground/components/playground-viewer'
import { PlaygroundEditorClient } from '@/modules/playground/components/playground-editor-client'
import { ExpiredLinkPage } from '@/modules/playground/components/expired-link-page'

export default async function SharedPlaygroundPage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const meta = await getSharedPlaygroundMeta(token)
    if (!meta) return <ExpiredLinkPage />

    if (meta.permission === 'VIEW_ONLY') {
        return <PlaygroundViewer playgroundId={meta.playgroundId} token={token} readOnly />
    }

    if (meta.permission === 'VIEW_AND_EDIT') {
        return <PlaygroundEditorClient playgroundId={meta.playgroundId} collab={{ token }} />
    }

    return <ExpiredLinkPage />
}
