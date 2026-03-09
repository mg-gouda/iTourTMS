import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      companyId: string | null;
      tourOperatorId: string | null;
      locale: string;
      roles: string[];
      permissions: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string | null;
    tourOperatorId: string | null;
    locale: string;
    roles: string[];
    permissions: string[];
  }
}
