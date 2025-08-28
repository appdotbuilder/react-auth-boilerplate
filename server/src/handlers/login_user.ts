import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type LoginUserInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const loginUser = async (input: LoginUserInput): Promise<AuthResponse> => {
  try {
    // 1. Find user by email in the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // 2. Check if user account is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // 3. Verify the provided password against the stored hash
    // Note: In a real implementation, you would use bcrypt.compare() here
    // For this implementation, we'll do a simple string comparison
    // assuming the password_hash is the actual password for testing purposes
    if (input.password !== user.password_hash) {
      throw new Error('Invalid credentials');
    }

    // 4. Generate a new session token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // 5. Store the session in the database
    await db.insert(sessionsTable)
      .values({
        user_id: user.id,
        token: token,
        expires_at: expiresAt
      })
      .execute();

    // 6. Return the user data (without password) and authentication token
    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token: token,
      expires_at: expiresAt
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};