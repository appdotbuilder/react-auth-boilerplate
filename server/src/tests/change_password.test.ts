import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type ChangePasswordInput } from '../schema';
import { changePassword } from '../handlers/change_password';
import { eq } from 'drizzle-orm';

// Simple bcrypt-compatible hashing function (same as in handler)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Test setup data
const createTestUser = async (emailSuffix?: string) => {
  const passwordHash = await hashPassword('currentPassword123');
  const email = `test${emailSuffix ? '-' + emailSuffix : ''}-${Date.now()}@example.com`;
  
  const users = await db.insert(usersTable)
    .values({
      email: email,
      password_hash: passwordHash,
      first_name: 'Test',
      last_name: 'User',
      is_active: true
    })
    .returning()
    .execute();
    
  return users[0];
};

const createTestSession = async (userId: number, tokenSuffix?: string) => {
  const token = `test-session-token-${tokenSuffix || Date.now()}-${Math.random()}`;
  
  const sessions = await db.insert(sessionsTable)
    .values({
      user_id: userId,
      token: token,
      expires_at: new Date(Date.now() + 3600000) // 1 hour from now
    })
    .returning()
    .execute();
    
  return sessions[0];
};

const testInput: ChangePasswordInput = {
  current_password: 'currentPassword123',
  new_password: 'newPassword456'
};

describe('changePassword', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should change password successfully', async () => {
    const user = await createTestUser();
    
    const result = await changePassword(user.id, testInput);
    
    expect(result.success).toBe(true);
  });

  it('should update password hash in database', async () => {
    const user = await createTestUser();
    const originalPasswordHash = user.password_hash;
    
    await changePassword(user.id, testInput);
    
    // Verify password hash was updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
      
    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].password_hash).not.toEqual(originalPasswordHash);
    
    // Verify new password hash matches expected value
    const expectedNewHash = await hashPassword('newPassword456');
    expect(updatedUsers[0].password_hash).toEqual(expectedNewHash);
  });

  it('should update updated_at timestamp', async () => {
    const user = await createTestUser();
    const originalUpdatedAt = user.updated_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await changePassword(user.id, testInput);
    
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
      
    expect(updatedUsers[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUsers[0].updated_at > originalUpdatedAt).toBe(true);
  });

  it('should invalidate all existing sessions', async () => {
    const user = await createTestUser();
    const session1 = await createTestSession(user.id, '1');
    const session2 = await createTestSession(user.id, '2');
    
    // Verify sessions exist before password change
    const sessionsBeforeChange = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.user_id, user.id))
      .execute();
    expect(sessionsBeforeChange).toHaveLength(2);
    
    await changePassword(user.id, testInput);
    
    // Verify all sessions were deleted
    const sessionsAfterChange = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.user_id, user.id))
      .execute();
    expect(sessionsAfterChange).toHaveLength(0);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;
    
    await expect(changePassword(nonExistentUserId, testInput))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error for incorrect current password', async () => {
    const user = await createTestUser();
    
    const invalidInput: ChangePasswordInput = {
      current_password: 'wrongPassword',
      new_password: 'newPassword456'
    };
    
    await expect(changePassword(user.id, invalidInput))
      .rejects.toThrow(/current password is incorrect/i);
  });

  it('should not change password when current password is wrong', async () => {
    const user = await createTestUser();
    const originalPasswordHash = user.password_hash;
    
    const invalidInput: ChangePasswordInput = {
      current_password: 'wrongPassword',
      new_password: 'newPassword456'
    };
    
    try {
      await changePassword(user.id, invalidInput);
    } catch (error) {
      // Expected to throw
    }
    
    // Verify password hash was not changed
    const unchangedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
      
    expect(unchangedUsers[0].password_hash).toEqual(originalPasswordHash);
  });

  it('should handle edge case with same current and new password', async () => {
    const user = await createTestUser();
    
    const samePasswordInput: ChangePasswordInput = {
      current_password: 'currentPassword123',
      new_password: 'currentPassword123'
    };
    
    const result = await changePassword(user.id, samePasswordInput);
    
    expect(result.success).toBe(true);
    
    // Verify password hash is still valid (even if same)
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
      
    const expectedHash = await hashPassword('currentPassword123');
    expect(updatedUsers[0].password_hash).toEqual(expectedHash);
  });

  it('should handle multiple sessions from same user', async () => {
    const user = await createTestUser();
    
    // Create multiple sessions with unique tokens
    await createTestSession(user.id, 'session1');
    await createTestSession(user.id, 'session2');
    await createTestSession(user.id, 'session3');
    
    const sessionsBeforeChange = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.user_id, user.id))
      .execute();
    expect(sessionsBeforeChange).toHaveLength(3);
    
    await changePassword(user.id, testInput);
    
    // Verify all sessions were deleted
    const sessionsAfterChange = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.user_id, user.id))
      .execute();
    expect(sessionsAfterChange).toHaveLength(0);
  });
});