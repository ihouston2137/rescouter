import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'

const protectedPaths = ['/admin']
const authPaths = ['/login']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isProtected = protectedPaths.some((p) => path.startsWith(p))
  const isAuthPath = authPaths.includes(path)

  const sessionToken = request.cookies.get('session')?.value
  const session = await decrypt(sessionToken)

  if (isProtected && !session?.userId) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  if (isAuthPath && session?.userId) {
    return NextResponse.redirect(new URL('/admin', request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
