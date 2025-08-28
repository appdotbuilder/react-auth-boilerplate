import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schema types
import { 
  registerUserInputSchema, 
  loginUserInputSchema, 
  validateSessionInputSchema,
  updateUserInputSchema,
  changePasswordInputSchema 
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { validateSession } from './handlers/validate_session';
import { logoutUser } from './handlers/logout_user';
import { getCurrentUser } from './handlers/get_current_user';
import { updateUser } from './handlers/update_user';
import { changePassword } from './handlers/change_password';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Create a protected procedure that validates session
const protectedProcedure = publicProcedure.use(async ({ next, getRawInput }) => {
  // In real implementation, extract token from headers/cookies
  // For now, this is a placeholder for session validation middleware
  const rawInput = await getRawInput();
  const token = (rawInput as any)?.token || 'placeholder_token';
  
  try {
    const user = await validateSession({ token });
    return next({
      ctx: { user }
    });
  } catch (error) {
    throw new Error('Unauthorized');
  }
});

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Public authentication endpoints
  register: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  logout: publicProcedure
    .input(validateSessionInputSchema)
    .mutation(({ input }) => logoutUser(input)),

  // Protected endpoints requiring authentication
  getCurrentUser: protectedProcedure
    .input(validateSessionInputSchema)
    .query(({ input }) => getCurrentUser(input)),

  updateProfile: protectedProcedure
    .input(updateUserInputSchema)
    .mutation(({ input, ctx }) => {
      // Ensure user can only update their own profile
      if (input.id !== ctx.user.id) {
        throw new Error('Forbidden: Cannot update another user\'s profile');
      }
      return updateUser(input);
    }),

  changePassword: protectedProcedure
    .input(changePasswordInputSchema.extend({
      token: validateSessionInputSchema.shape.token
    }))
    .mutation(({ input, ctx }) => {
      return changePassword(ctx.user.id, {
        current_password: input.current_password,
        new_password: input.new_password
      });
    }),

  // Session validation endpoint (can be used by frontend for route protection)
  validateSession: publicProcedure
    .input(validateSessionInputSchema)
    .query(({ input }) => validateSession(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: true
      })(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log(`Authentication endpoints available:`);
  console.log(`- POST /register - User registration`);
  console.log(`- POST /login - User login`);
  console.log(`- POST /logout - User logout`);
  console.log(`- GET /getCurrentUser - Get current user profile`);
  console.log(`- POST /updateProfile - Update user profile`);
  console.log(`- POST /changePassword - Change user password`);
  console.log(`- GET /validateSession - Validate session token`);
}

start();