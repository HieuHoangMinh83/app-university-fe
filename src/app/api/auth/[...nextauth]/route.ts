import axios, { AxiosResponse } from "axios";
import NextAuth, { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authOptions } from "@/app/utils/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
