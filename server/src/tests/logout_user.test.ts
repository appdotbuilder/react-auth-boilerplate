import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type ValidateSessionInput } from '../schema';
import { logoutUser } from '../handlers/logout_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password_123',
  first_name: 'John',
  last_name: 'Doe'
};

// Test session data
const testSession = {
  token: 'test_session_token_123',
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
};

const validInput: ValidateSessionInput = {
  token: 'test_session_token_123'
};

describe('logoutUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully logout user with valid session', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create session for the user
    await db.insert(sessionsTable)
      .values({
        ...testSession,
        user_id: userId
      })
      .execute();

    // Verify session exists before logout
    const sessionsBefore = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, validInput.token))
      .execute();
    expect(sessionsBefore).toHaveLength(1);

    // Logout user
    const result = await logoutUser(validInput);

    // Should return success
    expect(result.success).toBe(true);

    // Session should be deleted from database
    const sessionsAfter = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, validInput.token))
      .execute();
    expect(sessionsAfter).toHaveLength(0);
  });

  it('should return success for non-existent session token', async () => {
    const invalidInput: ValidateSessionInput = {
      token: 'non_existent_token'
    };

    // Should not throw error and return success
    const result = await logoutUser(invalidInput);
    expect(result.success).toBe(true);
  });

  it('should return success for empty token', async () => {
    const emptyTokenInput: ValidateSessionInput = {
      token: ''
    };

    // Should handle empty token gracefully
    const result = await logoutUser(emptyTokenInput);
    expect(result.success).toBe(true);
  });

  it('should not affect other user sessions', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com'
      })
      .returning()
      .execute();

    // Create sessions for both users
    const session1Token = 'session_token_user1';
    const session2Token = 'session_token_user2';

    await db.insert(sessionsTable)
      .values([
        {
          user_id: user1Result[0].id,
          token: session1Token,
          expires_at: testSession.expires_at
        },
        {
          user_id: user2Result[0].id,
          token: session2Token,
          expires_at: testSession.expires_at
        }
      ])
      .execute();

    // Logout user1
    const result = await logoutUser({ token: session1Token });
    expect(result.success).toBe(true);

    // User1 session should be deleted
    const user1Sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, session1Token))
      .execute();
    expect(user1Sessions).toHaveLength(0);

    // User2 session should remain intact
    const user2Sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, session2Token))
      .execute();
    expect(user2Sessions).toHaveLength(1);
    expect(user2Sessions[0].user_id).toBe(user2Result[0].id);
  });

  it('should handle multiple sessions for same user correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple sessions for the same user
    const session1Token = 'session_token_1';
    const session2Token = 'session_token_2';

    await db.insert(sessionsTable)
      .values([
        {
          user_id: userId,
          token: session1Token,
          expires_at: testSession.expires_at
        },
        {
          user_id: userId,
          token: session2Token,
          expires_at: testSession.expires_at
        }
      ])
      .execute();

    // Logout only one session
    const result = await logoutUser({ token: session1Token });
    expect(result.success).toBe(true);

    // First session should be deleted
    const session1After = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, session1Token))
      .execute();
    expect(session1After).toHaveLength(0);

    // Second session should remain
    const session2After = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, session2Token))
      .execute();
    expect(session2After).toHaveLength(1);
    expect(session2After[0].user_id).toBe(userId);
  });
});