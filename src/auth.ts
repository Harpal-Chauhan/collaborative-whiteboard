
import NextAuth from "next-auth";
import Credentials, {
    type CredentialsConfig,
} from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";

class AccountNotFoundError extends CredentialsSignin {
    code = "account_not_found";
}

class IncorrectPasswordError extends CredentialsSignin {
    code = "incorrect_password";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: {
        strategy: "jwt",
        maxAge: 2 * 60 * 60
    },

    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },

            async authorize(credentials) {
                const parsed = z
                    .object({
                        email: z.string().trim().email(),
                        password: z.string().min(1),
                    })
                    .safeParse(credentials);

                if (!parsed.success) {
                    return null;
                }

                const email = parsed.data.email.toLowerCase();

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user) {
                    throw new AccountNotFoundError();
                }

                const validPassword = await bcrypt.compare(
                    parsed.data.password,
                    user.passwordHash
                );

                if (!validPassword) {
                    throw new IncorrectPasswordError();
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                };
            },
        }),
    ],
});
