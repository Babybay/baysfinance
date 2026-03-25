import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface User {
        role?: string;
        clientId?: string;
        organisationId?: string;
    }

    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            clientId?: string;
            organisationId?: string;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: string;
        clientId?: string;
        organisationId?: string;
    }
}
