import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create a test user before each test
  const testUser = {
    email: 'test@example.com',
    password_hash: 'testpassword123', // In real app, this would be a bcrypt hash
    first_name: 'John',
    last_name: 'Doe',
    is_active: true
  };

  const validLoginInput: LoginUserInput = {
    email: 'test@example.com',
    password: 'testpassword123'
  };

  it('should successfully log in a user with valid credentials', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = users[0];

    // Attempt login
    const result = await loginUser(validLoginInput);

    // Verify response structure
    expect(result.user.id).toEqual(createdUser.id);
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.first_name).toEqual('John');
    expect(result.user.last_name).toEqual('Doe');
    expect(result.user.is_active).toEqual(true);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    
    // Verify token and expiry
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at.getTime()).toBeGreaterThan(Date.now());

    // Verify no password_hash is returned
    expect('password_hash' in result.user).toBe(false);
  });

  it('should create a session record in the database', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = users[0];

    // Login user
    const result = await loginUser(validLoginInput);

    // Verify session was created in database
    const sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, result.token))
      .execute();

    expect(sessions).toHaveLength(1);
    
    const session = sessions[0];
    expect(session.user_id).toEqual(createdUser.id);
    expect(session.token).toEqual(result.token);
    expect(session.expires_at).toEqual(result.expires_at);
    expect(session.created_at).toBeInstanceOf(Date);
  });

  it('should reject login with invalid email', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidEmailInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'testpassword123'
    };

    // Attempt login with invalid email
    await expect(loginUser(invalidEmailInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should reject login with invalid password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidPasswordInput: LoginUserInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    // Attempt login with invalid password
    await expect(loginUser(invalidPasswordInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should reject login for inactive user', async () => {
    // Create inactive test user
    const inactiveUser = {
      ...testUser,
      is_active: false
    };

    await db.insert(usersTable)
      .values(inactiveUser)
      .execute();

    // Attempt login with inactive user
    await expect(loginUser(validLoginInput)).rejects.toThrow(/account is deactivated/i);
  });

  it('should generate unique tokens for multiple logins', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Perform two logins
    const result1 = await loginUser(validLoginInput);
    const result2 = await loginUser(validLoginInput);

    // Tokens should be different
    expect(result1.token).not.toEqual(result2.token);

    // Both sessions should exist in database
    const sessions = await db.select()
      .from(sessionsTable)
      .execute();

    expect(sessions).toHaveLength(2);
    expect(sessions.map(s => s.token)).toContain(result1.token);
    expect(sessions.map(s => s.token)).toContain(result2.token);
  });

  it('should set session expiry to 24 hours from login time', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const loginTime = Date.now();
    const result = await loginUser(validLoginInput);

    // Check that expires_at is approximately 24 hours from now
    const expectedExpiry = loginTime + 24 * 60 * 60 * 1000;
    const actualExpiry = result.expires_at.getTime();
    
    // Allow 5 second tolerance for test execution time
    expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(5000);
  });
});