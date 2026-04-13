// here we will fetch the shareable link for the user

import { db } from "@/lib/db";
import {auth} from "@/auth"
import { NextResponse,NextRequest } from "next/server";


export async function GET(request:NextRequest,{params}:{params:{token:string}}) {
    // check for the session
    const session=await auth()
    const userId = session?.user?.id ?? null
    if(!session?.user?.id){
        return NextResponse.json({error:"Unauthorized"},{status:403})
    }

    // get the token from route params
    const {token}=params

    // fetching the sharelink from db and checking is Revoked and expires at and perfoming some op and then return
    const link=await db.shareLink.findFirst({
        where:{
            token,
        },
        include:{
            createdBy:{
                select:{
                    name:true
                }
            }
        }
    })
    if(!link){
        return NextResponse.json({error:"Link Not found"},{status:404})
    }
    if(!link.isRevoked){
        return NextResponse.json({ error: "Link Revoked" }, { status: 410 })
    }
    if(link.expiresAt && link.expiresAt< new Date()){
        return NextResponse.json({ error: "Link Expired" }, { status: 410 })
    }

    // now if all is good then we will increment the accessCount 
    if (userId) {
        try {
            // Try to create a unique access row; if it already exists, do nothing
            await db.$transaction(async (tx) => {
                await tx.shareLinkAccess.create({
                    data: {
                        shareLinkId: link.id,
                        userId,
                    },
                })

                await tx.shareLink.update({
                    where: { id: link.id },
                    data: {
                        accessCount: { increment: 1 },
                    },
                })
            })
        } catch (error) {
        // If unique constraint fails, we just ignore (user already counted)
        // You can check for specific error codes if you want
          }
    }

    return NextResponse.json({
        permission:link.permission,
        playgroundId:link.playgroundId,
        expiresAt:link.expiresAt,
        ownerName:link.createdBy?.name ?? null
    })
}