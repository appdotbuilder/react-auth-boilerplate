import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        is_active: true
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should update user first name', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      first_name: 'Jane'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Doe'); // Unchanged
    expect(result.email).toEqual('test@example.com'); // Unchanged
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update user last name', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      last_name: 'Smith'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.first_name).toEqual('John'); // Unchanged
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('test@example.com'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update user email', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      email: 'newemail@example.com'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('newemail@example.com');
    expect(result.first_name).toEqual('John'); // Unchanged
    expect(result.last_name).toEqual('Doe'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      email: 'updated@example.com',
      first_name: 'Updated',
      last_name: 'User'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('updated@example.com');
    expect(result.first_name).toEqual('Updated');
    expect(result.last_name).toEqual('User');
    expect(result.is_active).toEqual(true); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should save changes to database', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      first_name: 'DatabaseTest',
      email: 'dbtest@example.com'
    };

    await updateUser(input);

    // Verify changes were saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(users).toHaveLength(1);
    const updatedUser = users[0];
    expect(updatedUser.first_name).toEqual('DatabaseTest');
    expect(updatedUser.email).toEqual('dbtest@example.com');
    expect(updatedUser.last_name).toEqual('Doe'); // Unchanged
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
    expect(updatedUser.updated_at > testUser.updated_at).toBe(true);
  });

  it('should throw error when user does not exist', async () => {
    const input: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      first_name: 'NonExistent'
    };

    await expect(updateUser(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when email is already taken by another user', async () => {
    // Create two users
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password2',
        first_name: 'User',
        last_name: 'Two',
        is_active: true
      })
      .returning()
      .execute();

    // Try to update user2's email to user1's email
    const input: UpdateUserInput = {
      id: user2[0].id,
      email: 'test@example.com' // This email belongs to user1
    };

    await expect(updateUser(input)).rejects.toThrow(/email is already taken/i);
  });

  it('should allow updating email to the same email', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      email: 'test@example.com', // Same email as existing
      first_name: 'SameEmail'
    };

    const result = await updateUser(input);

    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('SameEmail');
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should not expose password_hash in response', async () => {
    const testUser = await createTestUser();
    
    const input: UpdateUserInput = {
      id: testUser.id,
      first_name: 'SecureTest'
    };

    const result = await updateUser(input);

    // Ensure password_hash is not in the response
    expect(result).not.toHaveProperty('password_hash');
    expect(Object.keys(result)).toEqual([
      'id',
      'email',
      'first_name',
      'last_name',
      'is_active',
      'created_at',
      'updated_at'
    ]);
  });

  it('should preserve is_active status', async () => {
    // Create an inactive user
    const inactiveUser = await db.insert(usersTable)
      .values({
        email: 'inactive@example.com',
        password_hash: 'hashed_password',
        first_name: 'Inactive',
        last_name: 'User',
        is_active: false
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: inactiveUser[0].id,
      first_name: 'StillInactive'
    };

    const result = await updateUser(input);

    expect(result.is_active).toEqual(false); // Should remain inactive
    expect(result.first_name).toEqual('StillInactive');
  });
});