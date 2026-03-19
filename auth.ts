import { db } from '@/lib/db';
import NextAuth from "next-auth"
import {prismaAdapter} from "@next-auth/prisma-adapter"
import authConfig from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    callbacks:{
        async signIn({
            user,
            account,
        }){
            if(!user || !account){
                return false
            }
            const isExistingUser = await db.user.findUnique({
                where:{
                    email:user.email!
                }
            })
            if(!isExistingUser){
                const newUser=await db.user.create({
                    data:{
                        name:user.name!,
                        email:user.email!,
                        image:user.image!,
                    
                        accounts:{
                            // @ts-ignore
                            create:{
                                provider:account.provider,
                                providerAccountId:account.providerAccountId,
                                type:account.type,
                                access_token:account.access_token,
                                refresh_token:account.refresh_token,
                                expires_at:account.expires_at,
                                scope:account.scope,
                                token_type:account.token_type,
                                id_token:account.id_token,
                                session_state:account.session_state,
                            }
                        }
                    }
                })
                if(!newUser){
                    return false
                }     
            }   
            // now if the user is already existing then i need to link it with the acoount provider
            else{
                const existingAccount=await db.account.findUnique({
                    where:{
                        provider_providerAccountId:{
                            provider:account.provider,
                            providerAccountId:account.providerAccountId,
                        }
                    }
                })
            }

            // but again by chance if account does not exist then i will create the account for the existing user
            if(!existingAccount){
                await db.account.create({
                    data:{
                        userId:existingUser.id,
                        provider:account.provider,
                        providerAccountId:account.providerAccountId,
                        type:account.type,
                        access_token:account.access_token,
                        refresh_token:account.refresh_token,
                        expires_at:account.expires_at,
                        scope:account.scope,
                        token_type:account.token_type,
                        id_token:account.id_token,
                        // @ts-ignore
                        session_state:account.session_state,
                    }
                })
            
            
            return true
        
            },

        async jwt(){},
        async session(){},
    },
    secret:process.env.NEXTAUTH_SECRET,
    adapter:prismaAdapter(db),
    ...authConfig

})