import { auth } from '@/lib/auth'

const handler = async (req: Request) => {
  try {
    return await auth.handler(req)
  } catch (error) {
    console.error('[v0] Auth route error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Auth handler error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const PUT = handler
export const DELETE = handler
