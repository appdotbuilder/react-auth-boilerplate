import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type ValidateSessionInput, type PublicUser } from '../schema';
import { eq, and, gt } from 'drizzle-orm';

export const getCurrentUser = async (input: ValidateSessionInput): Promise<PublicUser> => {
  try {
    // Find the session and join with user data
    const result = await db.select({
      user_id: usersTable.id,
      email: usersTable.email,
      first_name: usersTable.first_name,
      last_name: usersTable.last_name,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at,
      expires_at: sessionsTable.expires_at
    })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.user_id, usersTable.id))
      .where(
        and(
          eq(sessionsTable.token, input.token),
          gt(sessionsTable.expires_at, new Date()) // Session must not be expired
        )
      )
      .execute();

    if (result.length === 0) {
      throw new Error('Invalid or expired session token');
    }

    const userData = result[0];

    // Check if user account is active
    if (!userData.is_active) {
      throw new Error('User account is inactive');
    }

    return {
      id: userData.user_id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      is_active: userData.is_active,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
};