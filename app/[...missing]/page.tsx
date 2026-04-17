import { redirect } from 'next/navigation'

type MissingPageProps = {
    params: Promise<{
        missing: string[]
    }>
}

// Redirect unmatched routes before they reach the not-found boundary.
export default async function MissingPage({ params }: MissingPageProps) {
    await params
    redirect('/')
}
