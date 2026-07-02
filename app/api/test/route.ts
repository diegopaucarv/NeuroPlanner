export const GET = () => {
  return new Response(JSON.stringify({ message: 'Test OK' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
