import { db } from '../db';
import { sessionsTable, usersTable } from '../db/schema';
import { type ValidateSessionInput, type PublicUser } from '../schema';
import { eq, and, gte } from 'drizzle-orm';

export const validateSession = async (input: ValidateSessionInput): Promise<PublicUser> => {
  try {
    // Query for session with user data in a single join query
    const result = await db.select({
      user: {
        id: usersTable.id,
        email: usersTable.email,
        first_name: usersTable.first_name,
        last_name: usersTable.last_name,
        is_active: usersTable.is_active,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at
      },
      session_expires_at: sessionsTable.expires_at
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.user_id, usersTable.id))
    .where(
      and(
        eq(sessionsTable.token, input.token),
        gte(sessionsTable.expires_at, new Date()) // Session must not be expired
      )
    )
    .execute();

    // Check if session exists and is valid
    if (result.length === 0) {
      throw new Error('Invalid or expired session token');
    }

    const { user } = result[0];

    // Verify user account is still active
    if (!user.is_active) {
      throw new Error('User account is not active');
    }

    // Return user data without password
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Session validation failed:', error);
    throw error;
  }
};