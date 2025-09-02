import NextAuth from 'next-auth';
import { authOptions } from './authOptions';

// Only export HTTP method handlers to satisfy Next.js 15 type constraints.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 