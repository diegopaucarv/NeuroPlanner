import { db } from '@/lib/db'
import { account, user as userTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import * as crypto from 'crypto'

export const POST = async (req: Request) => {
  try {
    const body = await req.json()
    const { email, password, name } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create user
    const userId = crypto.randomUUID()
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')

    await db.insert(userTable).values({
      id: userId,
      email,
      name: name || email.split('@')[0],
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create account (password auth)
    await db.insert(account).values({
      id: crypto.randomUUID(),
      userId,
      accountId: email,
      provider: 'credential',
      providerAccountId: email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return new Response(
      JSON.stringify({
        user: { id: userId, email, name },
        message: 'User created successfully',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Sign-up failed'
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
