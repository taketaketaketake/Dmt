import nodemailer from "nodemailer";
import { env } from "./env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

interface SendMagicLinkParams {
  to: string;
  magicLinkUrl: string;
}

export async function sendMagicLinkEmail({ to, magicLinkUrl }: SendMagicLinkParams): Promise<void> {
  // In development, log the link instead of sending
  if (env.isDev) {
    console.log("\n========================================");
    console.log("MAGIC LINK (dev mode):");
    console.log(magicLinkUrl);
    console.log("========================================\n");
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "Sign in to Detroit Directory",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #1a1a1a;">
          Sign in to Detroit Directory
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px;">
          Click the link below to sign in. This link expires in ${env.MAGIC_LINK_EXPIRY_MINUTES} minutes.
        </p>
        <a href="${magicLinkUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 16px; font-weight: 500;">
          Sign in
        </a>
        <p style="font-size: 14px; color: #888; margin-top: 32px;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}

// =============================================================================
// PROFILE APPROVAL EMAILS
// =============================================================================

interface ProfileApprovalParams {
  to: string;
  profileName: string;
}

export async function sendProfileApprovedEmail({ to, profileName }: ProfileApprovalParams): Promise<void> {
  if (env.isDev) {
    console.log("\n========================================");
    console.log("PROFILE APPROVED EMAIL (dev mode):");
    console.log(`To: ${to}`);
    console.log(`Profile: ${profileName}`);
    console.log("========================================\n");
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "Your profile has been approved",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #1a1a1a;">
          Welcome to Detroit Directory
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px;">
          Your profile <strong>${profileName}</strong> has been approved. You now have full access to the directory.
        </p>
        <a href="${env.APP_URL}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 16px; font-weight: 500;">
          View Directory
        </a>
      </div>
    `,
  });
}

interface ProfileRejectionParams {
  to: string;
  profileName: string;
  rejectionNote?: string;
}

export async function sendProfileRejectedEmail({ to, profileName, rejectionNote }: ProfileRejectionParams): Promise<void> {
  if (env.isDev) {
    console.log("\n========================================");
    console.log("PROFILE REJECTED EMAIL (dev mode):");
    console.log(`To: ${to}`);
    console.log(`Profile: ${profileName}`);
    if (rejectionNote) console.log(`Note: ${rejectionNote}`);
    console.log("========================================\n");
    return;
  }

  const noteSection = rejectionNote
    ? `<p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px; padding: 16px; background-color: #f5f5f5;"><strong>Note:</strong> ${rejectionNote}</p>`
    : "";

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "Your profile needs changes",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #1a1a1a;">
          Profile Review Update
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px;">
          Your profile <strong>${profileName}</strong> was not approved at this time.
        </p>
        ${noteSection}
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px;">
          You can update your profile and resubmit for review.
        </p>
        <a href="${env.APP_URL}/account/profile" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 16px; font-weight: 500;">
          Edit Profile
        </a>
      </div>
    `,
  });
}

// =============================================================================
// PROJECT NEEDS REMINDER EMAIL
// =============================================================================

interface NeedReminderParams {
  to: string;
  profileName: string;
  projectTitle: string;
  projectId: string;
}

export async function sendNeedReminderEmail({ to, profileName, projectTitle, projectId }: NeedReminderParams): Promise<void> {
  if (env.isDev) {
    console.log("\n========================================");
    console.log("NEED REMINDER EMAIL (dev mode):");
    console.log(`To: ${to}`);
    console.log(`Profile: ${profileName}`);
    console.log(`Project: ${projectTitle}`);
    console.log(`Project ID: ${projectId}`);
    console.log("========================================\n");
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: `Update your needs for ${projectTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #1a1a1a;">
          Keep your project needs current
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px;">
          Hi ${profileName},
        </p>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px;">
          It's been a while since you updated the needs for <strong>${projectTitle}</strong>. Keeping your needs current helps the community know how they can support you.
        </p>
        <a href="${env.APP_URL}/account/projects" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 16px; font-weight: 500;">
          Update Project Needs
        </a>
        <p style="font-size: 14px; color: #888; margin-top: 32px;">
          If your needs are still accurate, you can dismiss this reminder by visiting your project and saving without changes.
        </p>
      </div>
    `,
  });
}
