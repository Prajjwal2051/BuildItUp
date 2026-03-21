"use server"

// This file is for server actions related to the dashboard, such as fetching user-specific data or handling form submissions. For client-side interactions, use components and hooks within the dashboard module.

// when our user comes to the dashboard page, we want to fetch their playground and display them. This action will be called from the dashboard page component to get the data needed for rendering.
import { db } from "@/lib/db"
import { getUserById } from "@/modules/auth/actions"
import { currentUser } from './../../auth/actions/index';

// This function fetches all playgrounds associated with a given user ID. It first retrieves the user to ensure they exist and then includes their related playgrounds in the query.

export const getAllPlaygroundForUser= async()=>{
    const user = await currentUser()
    if(!user){
        return null
    }
    try {
        const playground = await db.playground.findMany({
            where: {
                userId: user?.id,
            },
            include: {
                user: true,
                Starmark: {
                    where: {
                        userId: user?.id!
                    },
                    select: {
                        isMarked: true
                    }
                }
            },
        });

        return playground;
    } catch (error) {
        console.log(error);
      }

}