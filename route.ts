// here we will be creating the routes for all other routes

// this is the public routes which can be accessed by anyone without authentication
export const publicRoutes: string[] = ['/']

// dynamic share routes bypass auth — the token itself is the credential
export const publicRoutePrefixes: string[] = ['/s', '/api/share']

// this is the protected routes which can only be accessed by authenticated users
export const protectedRoutes: string[] = ['/dashboard', '/profile', '/settings', '/admin']

// this is the auth routes which can only be accessed by unauthenticated users
export const authRoutes: string[] = ['/auth/sign-in', '/auth/sign-up']

// an array of route which is accessible to the public
export const apiAuthPrefix: string = '/api/auth'

export const DEFAULT_LOGIN_REDIRECT: string = '/' // changed to redirect to home page after login
