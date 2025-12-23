import { MagicLinkEmail } from "@/emails/magic-link-email";
import { EmailConfig } from "next-auth/providers/email";
import { Resend } from "resend";

import { env } from "@/env.mjs";
import { siteConfig } from "@/config/site";

import { getUserByEmail } from "./user";

export const resend = new Resend(env.RESEND_API_KEY);

export const sendVerificationRequest: EmailConfig["sendVerificationRequest"] =
  async ({ identifier, url, provider }) => {
    const user = await getUserByEmail(identifier);

    // Determine if this is an existing user or new signup
    const isExistingUser = !!user;
    const userVerified = user?.emailVerified ? true : false;

    // Set appropriate subject line
    let authSubject: string;
    if (!isExistingUser) {
      authSubject = `Welcome to ${siteConfig.name} - Verify your email`;
    } else if (userVerified) {
      authSubject = `Sign-in link for ${siteConfig.name}`;
    } else {
      authSubject = "Activate your account";
    }

    // Use user's name if available, otherwise use email prefix
    const firstName = user?.name || identifier.split("@")[0];

    try {
      const { data, error } = await resend.emails.send({
        from: provider.from,
        to:
          process.env.NODE_ENV === "development"
            ? "delivered@resend.dev"
            : identifier,
        subject: authSubject,
        react: MagicLinkEmail({
          firstName: firstName,
          actionUrl: url,
          mailType: isExistingUser && userVerified ? "login" : "register",
          siteName: siteConfig.name,
        }),
        // Set this to prevent Gmail from threading emails.
        // More info: https://resend.com/changelog/custom-email-headers
        headers: {
          "X-Entity-Ref-ID": new Date().getTime() + "",
        },
      });

      if (error || !data) {
        throw new Error(error?.message);
      }

      // console.log(data)
    } catch (error) {
      throw new Error("Failed to send verification email.");
    }
  };
