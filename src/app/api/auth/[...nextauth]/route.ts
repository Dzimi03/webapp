import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db, User } from '../../db';
import bcrypt from 'bcryptjs';


const handler = NextAuth({
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
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        if (!session.user) session.user = {};
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST }; 