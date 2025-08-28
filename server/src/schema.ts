import { z } from 'zod';

// User schema for database records
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Public user schema (without sensitive data like password_hash)
export const publicUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PublicUser = z.infer<typeof publicUserSchema>;

// Input schema for user registration
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100), // Password requirements
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50)
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Input schema for user login
export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Authentication response schema
export const authResponseSchema = z.object({
  user: publicUserSchema,
  token: z.string(), // JWT token or session token
  expires_at: z.coerce.date()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Input schema for updating user profile
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Input schema for changing password
export const changePasswordInputSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(100)
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

// Session schema for managing user sessions
export const sessionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  token: z.string(),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Session = z.infer<typeof sessionSchema>;

// Input schema for session validation
export const validateSessionInputSchema = z.object({
  token: z.string()
});

export type ValidateSessionInput = z.infer<typeof validateSessionInputSchema>;