import { apiAuthPrefix, publicRoutes, publicRoutePrefixes, authRoutes, DEFAULT_LOGIN_REDIRECT } from './route'
import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
    const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
    const isPublicPrefix = publicRoutePrefixes.some(p =>   // ← add this check
        nextUrl.pathname.startsWith(p)
    )
    const isAuthRoute = authRoutes.includes(nextUrl.pathname)

    if (isApiAuthRoute) {
        return null
    }
    if (isPublicRoute || isPublicPrefix) return NextResponse.next()  // ← allow through

    if (isAuthRoute) {
        if (isLoggedIn) {
            return Response.redirect(new URL('/dashboard', req.url))
        }

        return null
    }

    if (!isLoggedIn && !isPublicRoute) {
        return Response.redirect(new URL('/auth/sign-in', req.url))
    }

    return null
})

export const config = {
    //clerk regex to match all routes except for static files and api routes
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/'],
}
