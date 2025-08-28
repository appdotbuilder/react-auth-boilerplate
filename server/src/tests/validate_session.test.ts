import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type ValidateSessionInput } from '../schema';
import { validateSession } from '../handlers/validate_session';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Doe',
  is_active: true
};

const testInput: ValidateSessionInput = {
  token: 'valid_session_token'
};

describe('validateSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should validate active session and return user data', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create active session (expires in future)
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    await db.insert(sessionsTable)
      .values({
        user_id: user.id,
        token: testInput.token,
        expires_at: futureDate
      })
      .execute();

    const result = await validateSession(testInput);

    // Verify user data is returned correctly (without password)
    expect(result.id).toEqual(user.id);
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.is_active).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect('password_hash' in result).toBe(false); // Ensure password is not included
  });

  it('should throw error for non-existent session token', async () => {
    const invalidInput: ValidateSessionInput = {
      token: 'non_existent_token'
    };

    await expect(validateSession(invalidInput))
      .rejects
      .toThrow(/invalid or expired session token/i);
  });

  it('should throw error for expired session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create expired session (expires in past)
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);

    await db.insert(sessionsTable)
      .values({
        user_id: user.id,
        token: testInput.token,
        expires_at: pastDate
      })
      .execute();

    await expect(validateSession(testInput))
      .rejects
      .toThrow(/invalid or expired session token/i);
  });

  it('should throw error for inactive user account', async () => {
    // Create inactive test user
    const inactiveUser = {
      ...testUser,
      is_active: false
    };

    const userResult = await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create valid session for inactive user
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    await db.insert(sessionsTable)
      .values({
        user_id: user.id,
        token: testInput.token,
        expires_at: futureDate
      })
      .execute();

    await expect(validateSession(testInput))
      .rejects
      .toThrow(/user account is not active/i);
  });

  it('should handle session at exact expiration time', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create session that expires exactly now (should be considered expired)
    const now = new Date();
    now.setMilliseconds(0); // Remove milliseconds for more predictable testing

    await db.insert(sessionsTable)
      .values({
        user_id: user.id,
        token: testInput.token,
        expires_at: now
      })
      .execute();

    // Wait a tiny bit to ensure time has passed
    await new Promise(resolve => setTimeout(resolve, 1));

    await expect(validateSession(testInput))
      .rejects
      .toThrow(/invalid or expired session token/i);
  });

  it('should correctly join session and user data', async () => {
    // Create multiple users and sessions to test correct joining
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hash1',
        first_name: 'User',
        last_name: 'One',
        is_active: true
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com', 
        password_hash: 'hash2',
        first_name: 'User',
        last_name: 'Two',
        is_active: true
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    // Create sessions for both users
    await db.insert(sessionsTable)
      .values([
        {
          user_id: user1.id,
          token: 'token_for_user1',
          expires_at: futureDate
        },
        {
          user_id: user2.id,
          token: 'token_for_user2',
          expires_at: futureDate
        }
      ])
      .execute();

    // Validate session for user1
    const result1 = await validateSession({ token: 'token_for_user1' });
    expect(result1.email).toEqual('user1@example.com');
    expect(result1.first_name).toEqual('User');
    expect(result1.last_name).toEqual('One');

    // Validate session for user2
    const result2 = await validateSession({ token: 'token_for_user2' });
    expect(result2.email).toEqual('user2@example.com');
    expect(result2.first_name).toEqual('User');
    expect(result2.last_name).toEqual('Two');
  });
});