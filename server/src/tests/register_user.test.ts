import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'securepassword123',
  first_name: 'John',
  last_name: 'Doe'
};

const anotherTestInput: RegisterUserInput = {
  email: 'another@example.com',
  password: 'anotherpassword456',
  first_name: 'Jane',
  last_name: 'Smith'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user successfully', async () => {
    const result = await registerUser(testInput);

    // Verify response structure
    expect(result.user.id).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.first_name).toBe('John');
    expect(result.user.last_name).toBe('Doe');
    expect(result.user.is_active).toBe(true);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Verify user was saved to database
    const savedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(savedUsers).toHaveLength(1);
    const savedUser = savedUsers[0];
    
    expect(savedUser.email).toBe('test@example.com');
    expect(savedUser.first_name).toBe('John');
    expect(savedUser.last_name).toBe('Doe');
    expect(savedUser.is_active).toBe(true);
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toBe(testInput.password); // Should be hashed
    expect(savedUser.password_hash.length).toBeGreaterThan(testInput.password.length);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should create a session for the new user', async () => {
    const result = await registerUser(testInput);

    // Verify session was created
    const sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.user_id, result.user.id))
      .execute();

    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    
    expect(session.token).toBe(result.token);
    expect(session.expires_at).toEqual(result.expires_at);
    expect(session.created_at).toBeInstanceOf(Date);
  });

  it('should verify password can be verified against hash', async () => {
    const result = await registerUser(testInput);

    // Get the saved user with password hash
    const savedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    const savedUser = savedUsers[0];
    
    // Verify password can be checked against hash
    const isValidPassword = await Bun.password.verify(testInput.password, savedUser.password_hash);
    expect(isValidPassword).toBe(true);
    
    // Verify wrong password fails
    const isInvalidPassword = await Bun.password.verify('wrongpassword', savedUser.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should reject duplicate email registration', async () => {
    // Register first user
    await registerUser(testInput);

    // Try to register with same email
    const duplicateInput: RegisterUserInput = {
      ...testInput,
      first_name: 'Different',
      last_name: 'Name'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/email already registered/i);
  });

  it('should allow different emails to register', async () => {
    // Register first user
    const firstResult = await registerUser(testInput);
    
    // Register second user with different email
    const secondResult = await registerUser(anotherTestInput);

    expect(firstResult.user.id).not.toBe(secondResult.user.id);
    expect(firstResult.user.email).toBe('test@example.com');
    expect(secondResult.user.email).toBe('another@example.com');
    expect(firstResult.token).not.toBe(secondResult.token);

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    
    const emails = allUsers.map(user => user.email);
    expect(emails).toContain('test@example.com');
    expect(emails).toContain('another@example.com');
  });

  it('should generate unique session tokens', async () => {
    const firstResult = await registerUser(testInput);
    
    // Reset and register another user
    await resetDB();
    await createDB();
    
    const secondResult = await registerUser(anotherTestInput);

    expect(firstResult.token).not.toBe(secondResult.token);
    expect(firstResult.token.length).toBe(secondResult.token.length);
    expect(typeof firstResult.token).toBe('string');
    expect(typeof secondResult.token).toBe('string');
  });

  it('should set session expiration to 24 hours from now', async () => {
    const beforeRegistration = Date.now();
    const result = await registerUser(testInput);
    const afterRegistration = Date.now();

    const expectedMinExpiry = beforeRegistration + (24 * 60 * 60 * 1000);
    const expectedMaxExpiry = afterRegistration + (24 * 60 * 60 * 1000);

    expect(result.expires_at.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
    expect(result.expires_at.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
  });
});