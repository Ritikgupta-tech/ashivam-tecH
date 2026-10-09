import env from "../config/env.js";
import { verifyEmailTransport, sendEmail } from "../modules/notification/email.service.js";

const run = async () => {
  console.log("==================================================");
  console.log("   ASHIVAM TECHNOLOGIES - SMTP DIAGNOSTIC TOOL    ");
  console.log("==================================================");

  console.log(`Environment:           ${env.nodeEnv}`);
  console.log(`SMTP Host:             ${env.smtpHost || "(not set)"}`);
  console.log(`SMTP Port:             ${env.smtpPort || "(not set)"}`);
  console.log(`SMTP Secure:           ${env.smtpSecure}`);
  console.log(`SMTP User:             ${env.smtpUser ? `${env.smtpUser.substring(0, 3)}***` : "(not set)"}`);
  console.log(`SMTP Password:         ${env.smtpPassword ? "[CONFIGURED / REDACTED]" : "(not set)"}`);
  console.log(`Email From:            ${env.emailFrom}`);
  console.log(`Notification Recipient:${env.notificationRecipient || "(not set)"}`);
  console.log(`SMTP Configured Flag:  ${env.isSmtpConfigured}`);
  console.log("--------------------------------------------------");

  if (!env.isSmtpConfigured) {
    console.log("[Status] SMTP is NOT fully configured in current environment.");
    console.log("Required variables for active SMTP:");
    console.log("  - SMTP_HOST (e.g., smtp.gmail.com or mail.ashivam.com)");
    console.log("  - SMTP_PORT (e.g., 587 or 465)");
    console.log("  - SMTP_USER (e.g., info@ashivam.com)");
    console.log("  - SMTP_PASSWORD (secure application password)");
    console.log("\nSimulated mode will be used by the server when SMTP is unconfigured.");
    return;
  }

  console.log("[Verifying] Testing SMTP socket connection and authentication...");
  const verification = await verifyEmailTransport();

  if (verification.verified) {
    console.log("SUCCESS: SMTP connection and handshake authenticated successfully.");
  } else {
    console.error(`FAILURE: SMTP verification failed: ${verification.message}`);
    process.exitCode = 1;
    return;
  }

  // If --send-test was passed: node src/scripts/verify-smtp.js --send-test recipient@example.com
  const sendTestArgIndex = process.argv.indexOf("--send-test");
  if (sendTestArgIndex !== -1 && process.argv[sendTestArgIndex + 1]) {
    const testRecipient = process.argv[sendTestArgIndex + 1];
    console.log(`[Test Dispatch] Sending test email to ${testRecipient}...`);
    try {
      const dispatch = await sendEmail({
        to: testRecipient,
        subject: `[Diagnostic Test] Ashivam Technologies SMTP Verification ${new Date().toISOString()}`,
        text: "This is a diagnostic verification email from Ashivam Technologies backend server.",
        html: "<p>This is a diagnostic verification email from <strong>Ashivam Technologies</strong> backend server.</p>",
      });

      if (dispatch.delivered) {
        console.log(`SUCCESS: Test email delivered! Message ID: ${dispatch.messageId}`);
      } else {
        console.error(`FAILURE: Test email dispatch error: ${dispatch.error || dispatch.reason}`);
        process.exitCode = 1;
      }
    } catch (err) {
      console.error(`FAILURE: Unexpected error during test dispatch: ${err.message}`);
      process.exitCode = 1;
    }
  }
};

run().catch((err) => {
  console.error("FATAL: Unexpected script error:", err.message);
  process.exitCode = 1;
});
