import { vi } from "vitest";

export const sendMagicLinkEmail = vi.fn().mockResolvedValue(undefined);
export const sendProfileApprovedEmail = vi.fn().mockResolvedValue(undefined);
export const sendProfileRejectedEmail = vi.fn().mockResolvedValue(undefined);
export const sendNeedReminderEmail = vi.fn().mockResolvedValue(undefined);
export const sendNewMemberNotificationEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("../../lib/email.js", () => ({
  sendMagicLinkEmail,
  sendProfileApprovedEmail,
  sendProfileRejectedEmail,
  sendNeedReminderEmail,
  sendNewMemberNotificationEmail,
}));
