export const GET = async (req: Request) => {
  try {
    const { auth } = await import('@/lib/auth')
    return await auth.handler(req)
  } catch (error) {
    console.error('[v0] Auth GET error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Auth handler error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const POST = async (req: Request) => {
  try {
    const { auth } = await import('@/lib/auth')
    return await auth.handler(req)
  } catch (error) {
    console.error('[v0] Auth POST error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Auth handler error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const PATCH = async (req: Request) => {
  try {
    const { auth } = await import('@/lib/auth')
    return await auth.handler(req)
  } catch (error) {
    console.error('[v0] Auth PATCH error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Auth handler error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const PUT = async (req: Request) => {
  try {
    const { auth } = await import('@/lib/auth')
    return await auth.handler(req)
  } catch (error) {
    console.error('[v0] Auth PUT error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Auth handler error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const DELETE = async (req: Request) => {
  try {
    const { auth } = await import('@/lib/auth')
    return await auth.handler(req)
  } catch (error) {
    console.error('[v0] Auth DELETE error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Auth handler error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
