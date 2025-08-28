import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type ValidateSessionInput } from '../schema';
import { getCurrentUser } from '../handlers/get_current_user';

// Test data
const testUser = {
  email: 'john.doe@example.com',
  password_hash: 'hashed_password_123',
  first_name: 'John',
  last_name: 'Doe',
  is_active: true
};

const inactiveUser = {
  email: 'inactive@example.com',
  password_hash: 'hashed_password_456',
  first_name: 'Inactive',
  last_name: 'User',
  is_active: false
};

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user profile for valid session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create valid session (expires in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(sessionsTable)
      .values({
        user_id: userId,
        token: 'valid_session_token_123',
        expires_at: expiresAt
      })
      .execute();

    const input: ValidateSessionInput = {
      token: 'valid_session_token_123'
    };

    const result = await getCurrentUser(input);

    // Verify user profile data
    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.is_active).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Ensure password_hash is not included
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should throw error for invalid session token', async () => {
    const input: ValidateSessionInput = {
      token: 'non_existent_token'
    };

    await expect(getCurrentUser(input)).rejects.toThrow(/invalid or expired session token/i);
  });

  it('should throw error for expired session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create expired session (expired 1 hour ago)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() - 1);

    await db.insert(sessionsTable)
      .values({
        user_id: userId,
        token: 'expired_session_token',
        expires_at: expiresAt
      })
      .execute();

    const input: ValidateSessionInput = {
      token: 'expired_session_token'
    };

    await expect(getCurrentUser(input)).rejects.toThrow(/invalid or expired session token/i);
  });

  it('should throw error for inactive user account', async () => {
    // Create inactive user
    const userResult = await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create valid session for inactive user
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(sessionsTable)
      .values({
        user_id: userId,
        token: 'inactive_user_token',
        expires_at: expiresAt
      })
      .execute();

    const input: ValidateSessionInput = {
      token: 'inactive_user_token'
    };

    await expect(getCurrentUser(input)).rejects.toThrow(/user account is inactive/i);
  });

  it('should handle session at exact expiration time', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create session that expires right now (should be considered expired)
    const expiresAt = new Date();

    await db.insert(sessionsTable)
      .values({
        user_id: userId,
        token: 'exactly_expired_token',
        expires_at: expiresAt
      })
      .execute();

    // Wait a tiny bit to ensure the session is expired
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: ValidateSessionInput = {
      token: 'exactly_expired_token'
    };

    await expect(getCurrentUser(input)).rejects.toThrow(/invalid or expired session token/i);
  });

  it('should return correct user data with join', async () => {
    // Create multiple users
    const user1Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user1@example.com',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create sessions for both users
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(sessionsTable)
      .values([
        {
          user_id: user1Id,
          token: 'user1_token',
          expires_at: expiresAt
        },
        {
          user_id: user2Id,
          token: 'user2_token',
          expires_at: expiresAt
        }
      ])
      .execute();

    // Test user1 session
    const user1Input: ValidateSessionInput = {
      token: 'user1_token'
    };

    const user1Result2 = await getCurrentUser(user1Input);
    expect(user1Result2.id).toEqual(user1Id);
    expect(user1Result2.email).toEqual('user1@example.com');
    expect(user1Result2.first_name).toEqual('User');
    expect(user1Result2.last_name).toEqual('One');

    // Test user2 session
    const user2Input: ValidateSessionInput = {
      token: 'user2_token'
    };

    const user2Result2 = await getCurrentUser(user2Input);
    expect(user2Result2.id).toEqual(user2Id);
    expect(user2Result2.email).toEqual('user2@example.com');
    expect(user2Result2.first_name).toEqual('User');
    expect(user2Result2.last_name).toEqual('Two');
  });
});