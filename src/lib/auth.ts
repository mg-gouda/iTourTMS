import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.password || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        // Fetch user details for JWT
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            companyId: true,
            tourOperatorId: true,
            locale: true,
            userRoles: {
              select: {
                role: {
                  select: {
                    name: true,
                    rolePermissions: {
                      select: {
                        permission: {
                          select: { code: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (dbUser) {
          token.companyId = dbUser.companyId;
          token.tourOperatorId = dbUser.tourOperatorId;
          token.locale = dbUser.locale;
          token.roles = dbUser.userRoles.map((ur) => ur.role.name);
          token.permissions = [
            ...new Set(
              dbUser.userRoles.flatMap((ur) =>
                ur.role.rolePermissions.map((rp) => rp.permission.code),
              ),
            ),
          ];
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as string | null;
        session.user.tourOperatorId = token.tourOperatorId as string | null;
        session.user.locale = token.locale as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
});
