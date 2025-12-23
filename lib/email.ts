import { EmailConfig } from "next-auth/providers/email";
import { Resend } from "resend";

import { env } from "@/env.mjs";
import { siteConfig } from "@/config/site";

import { getUserByEmail } from "./user";

export const resend = new Resend(env.RESEND_API_KEY);

// Simple HTML email template (avoids react-email webpack issues)
function getMagicLinkEmailHtml({
  firstName,
  actionUrl,
  mailType,
  siteName,
}: {
  firstName: string;
  actionUrl: string;
  mailType: "login" | "register";
  siteName: string;
}) {
  const buttonText = mailType === "login" ? "Sign In" : "Activate Account";
  const actionText = mailType === "login" ? "sign in to" : "activate";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 12px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 24px; font-weight: bold;">P</span>
      </div>
    </div>
    <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px; text-align: center;">
      ${mailType === "login" ? "Welcome back!" : `Welcome to ${siteName}!`}
    </h1>
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 24px;">
      Hi ${firstName},
    </p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 32px;">
      Click the button below to ${actionText} your account.
    </p>
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        ${buttonText}
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 0 0 16px;">
      This link expires in 24 hours and can only be used once.
    </p>
    ${mailType === "login" ? `<p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 0;">If you didn't request this, you can safely ignore this email.</p>` : ""}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      ${siteName}
    </p>
  </div>
</body>
</html>
  `;
}

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
        html: getMagicLinkEmailHtml({
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
