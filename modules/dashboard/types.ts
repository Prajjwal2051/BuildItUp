export interface User {
    id: string
    name: string
    email: string
    image?: string | null
    role: string
    creratedAt: Date
    updatedAt: Date
}

export interface Project {
    id: string
    title: string
    description: string
    createdAt: Date
    updatedAt: Date
    userId: string
    template: string
    user?: User
    starMark?: { isMarked: boolean }[]
}