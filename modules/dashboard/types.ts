// This file defines TypeScript interfaces for the User and Project entities used in the dashboard module. These interfaces represent the structure of the data that will be handled in the dashboard, including user information and project details.

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
