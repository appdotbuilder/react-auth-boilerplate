import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type RegisterUserInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const registerUser = async (input: RegisterUserInput): Promise<AuthResponse> => {
  try {
    // 1. Check if email is already registered
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      throw new Error('Email already registered');
    }

    // 2. Hash the password using Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(input.password);

    // 3. Create a new user record
    const userResult = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash,
        first_name: input.first_name,
        last_name: input.last_name,
        is_active: true
      })
      .returning()
      .execute();

    const newUser = userResult[0];

    // 4. Generate a secure session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Create session record
    await db.insert(sessionsTable)
      .values({
        user_id: newUser.id,
        token: sessionToken,
        expires_at: expiresAt
      })
      .execute();

    // 5. Return user data (without password) and authentication token
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      },
      token: sessionToken,
      expires_at: expiresAt
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};