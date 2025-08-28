import { db } from '../db';
import { sessionsTable } from '../db/schema';
import { type ValidateSessionInput } from '../schema';
import { eq } from 'drizzle-orm';

export const logoutUser = async (input: ValidateSessionInput): Promise<{ success: boolean }> => {
  try {
    // Delete the session by token
    const result = await db.delete(sessionsTable)
      .where(eq(sessionsTable.token, input.token))
      .execute();

    // Return success regardless of whether token existed
    // This prevents information leakage about valid/invalid tokens
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};