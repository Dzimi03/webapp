import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db, User } from '../../db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        await db.read();
        const user = db.data?.users.find(
          (u: User) => u.email === credentials?.email
        );
        if (user && credentials?.password && await bcrypt.compare(credentials.password, user.password)) {
          return { id: user.id, name: user.name, email: user.email };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id; // TODO: refine types
      }
      return token;
    },
    async session({ session, token }) {
      if (token && (token as any).id) {
        if (!session.user) session.user = {} as any;
        (session.user as any).id = (token as any).id as string;
      }
      return session;
    },
  },
};
