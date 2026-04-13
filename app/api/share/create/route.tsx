import { auth } from '@/auth'
import { NextRequest,NextResponse } from 'next/server'
import { generateShareToken } from '@/lib/share-token'
import { db } from '@/lib/db'


// first we will make the post route to create a shareable link for the playground
export async function POST(request: NextRequest) {
    // first we will resolve the session- reject if the user is not authenticated
    const session = await auth()
    if(!session?.user?.id){
        return NextResponse.json(
            {
                error:"Unauthorized",
            },
            {
                status:401
            }
        )
    }
    // now we will fgetch thew playgroundid, permission and expiry date
    const {playgroundId,permission= "VIEWONLY",expiresIn}= await request.json()
    if(!playgroundId){
        return NextResponse.json({error:"Forbidden"},{status:400})
    }
    // now we will also check the ownership 
    const playground=await db.playground.findFirst({
        where:{
            id:playgroundId,
            userId:session.user.id
        }
    })
    if(!playground){
        return NextResponse.json({error:"Unauthorized"},{status:403})
    }

    // now we will generate a shareable link
    const token=generateShareToken(playgroundId)
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn *1000): null

    // now just update it in database
    const shareLink = await db.shareLink.create( {
        data:{
            token,
            playgroundId,
            permission,
            createdById:session.user.id,
            expiresAt
        }
    })
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/share/${shareLink.token}`
    return NextResponse.json({
        shareUrl,
        token,
        id:shareLink.id
    })
}
