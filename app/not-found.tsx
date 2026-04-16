import { redirect } from 'next/navigation'

// Sends unknown routes back to the home page so users land on a real page.
export default function NotFound() {
    redirect('/')
}
