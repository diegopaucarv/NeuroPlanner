import { db } from '@/lib/db'
import { account, user as userTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createHash } from 'crypto'

export const POST = async (req: Request) => {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Find user by email
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1)

    if (users.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const user = users[0]

    // Find account with password for this user
    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, user.id))
      .limit(1)

    if (accounts.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userAccount = accounts[0]

    // Hash the provided password and compare
    const hashedPassword = createHash('sha256').update(password).digest('hex')

    if (userAccount.password !== hashedPassword) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Password is correct - return success with user data
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        message: 'Sign in successful',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Sign in failed'
    return new Response(
      JSON.stringify({
        error: errorMsg,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
