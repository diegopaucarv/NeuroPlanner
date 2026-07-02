export const GET = async () => {
  try {
    const { auth } = await import('@/lib/auth')
    return new Response(JSON.stringify({ message: 'Auth imported OK', hasHandler: !!auth.handler }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
