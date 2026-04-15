import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { apiAuthPrefix, publicRoutes, publicRoutePrefixes, authRoutes } from './route'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
  const isPublicPrefix = publicRoutePrefixes.some((p) =>
    nextUrl.pathname.startsWith(p)
  )
  const isAuthRoute = authRoutes.includes(nextUrl.pathname)

  if (isApiAuthRoute) return NextResponse.next()
  if (isPublicRoute || isPublicPrefix) return NextResponse.next()

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
