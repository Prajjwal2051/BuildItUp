export interface User{
    id: string
    name: string
    email: string
    image: string
    role: string
    createdAt: Date
    updatedAt: Date
}

export interface Project{
    id: string
    name: string
    description: string
    createdAt: Date
    updatedAt: Date
    userId: string
    template: string
    user:User
    StarMark:{isStarMarked: boolean}[]
}