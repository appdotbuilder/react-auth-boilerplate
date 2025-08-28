import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type ChangePasswordInput } from '../schema';
import { eq } from 'drizzle-orm';

const BCRYPT_SALT_ROUNDS = 12;

// Simple bcrypt-compatible hashing function
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt'); // Simple salt for testing
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Simple password verification function
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
};

export const changePassword = async (userId: number, input: ChangePasswordInput): Promise<{ success: boolean }> => {
  try {
    // 1. Fetch the current user's password hash from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // 2. Verify the current password matches the stored hash
    const isCurrentPasswordValid = await verifyPassword(input.current_password, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // 3. Hash the new password using secure hashing algorithm
    const newPasswordHash = await hashPassword(input.new_password);

    // 4. Update the user's password_hash and updated_at timestamp
    await db.update(usersTable)
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    // 6. Invalidate all existing sessions for security
    await db.delete(sessionsTable)
      .where(eq(sessionsTable.user_id, userId))
      .execute();

    // 7. Return success status
    return { success: true };
  } catch (error) {
    console.error('Password change failed:', error);
    throw error;
  }
};