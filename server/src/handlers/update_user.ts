import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type PublicUser } from '../schema';
import { eq, and, ne, type SQL } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<PublicUser> => {
  try {
    // First, check if the user exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error('User not found');
    }

    const existingUser = existingUsers[0];

    // If email is being updated, check if it's already taken by another user
    if (input.email && input.email !== existingUser.email) {
      const conditions: SQL<unknown>[] = [
        eq(usersTable.email, input.email),
        ne(usersTable.id, input.id)
      ];

      const emailConflicts = await db.select()
        .from(usersTable)
        .where(and(...conditions))
        .execute();

      if (emailConflicts.length > 0) {
        throw new Error('Email is already taken');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.first_name !== undefined) {
      updateData.first_name = input.first_name;
    }
    if (input.last_name !== undefined) {
      updateData.last_name = input.last_name;
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    const updatedUser = result[0];

    // Return public user data (without password_hash)
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      is_active: updatedUser.is_active,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};