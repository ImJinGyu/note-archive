import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // _next static / api 요청은 IP 차단 대상 제외
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return NextResponse.next()

  // 요청자 IP 추출
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') ?? '127.0.0.1')

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/blocked_ips?ip=eq.${encodeURIComponent(ip)}&select=id`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        cache: 'no-store',
      }
    )
    if (res.ok) {
      const blocked: { id: string }[] = await res.json()
      if (blocked.length > 0) {
        return new NextResponse(
          `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f9ff">
           <div style="text-align:center"><h1 style="color:#0369a1">403</h1><p style="color:#0284c7">접근이 차단된 IP입니다.</p></div>
           </body></html>`,
          { status: 403, headers: { 'Content-Type': 'text/html' } }
        )
      }
    }
  } catch {
    // DB 조회 실패 시 통과 (fail-open)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
