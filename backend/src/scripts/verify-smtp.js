import env from "../config/env.js";
import {
  verifyEmailTransport,
  sendEmail,
  sanitizeEmailHeader,
} from "../modules/notification/email.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const run = async () => {
  console.log("==================================================");
  console.log("   ASHIVAM TECHNOLOGIES - SMTP DIAGNOSTIC TOOL    ");
  console.log("==================================================");

  const safeFrom = env.smtpFrom || env.emailFrom;
  const safeAlert = env.alertEmail || env.notificationRecipient;

  console.log(`Environment:           ${env.nodeEnv}`);
  console.log(`SMTP Host:             ${env.smtpHost || "(not set)"}`);
  console.log(`SMTP Port:             ${env.smtpPort || "(not set)"}`);
  console.log(`SMTP Secure:           ${env.smtpSecure}`);
  console.log(
    `SMTP User:             ${
      env.smtpUser ? `${env.smtpUser.substring(0, 3)}***` : "(not set)"
    }`
  );
  console.log(
    `SMTP Password:         ${
      env.smtpPassword ? "[CONFIGURED / REDACTED]" : "(not set)"
    }`
  );
  console.log(`SMTP From:             ${safeFrom}`);
  console.log(`Alert Email:           ${safeAlert || "(not set)"}`);
  console.log(`SMTP Configured Flag:  ${env.isSmtpConfigured}`);
  console.log(
    `Timeouts (Connect/Sock):${env.smtpConnectionTimeoutMs}ms / ${env.smtpSocketTimeoutMs}ms`
  );
  console.log("--------------------------------------------------");

  if (!env.isSmtpConfigured) {
    console.log("[Status] SMTP is NOT fully configured in the current environment.");
    console.log("\nRequired environment variables for live SMTP delivery:");
    console.log("  - SMTP_HOST       (e.g., smtp.sendgrid.net or smtp.gmail.com)");
    console.log("  - SMTP_PORT       (e.g., 587 or 465)");
    console.log("  - SMTP_USER       (e.g., apikey or your username)");
    console.log("  - SMTP_PASSWORD   (SMTP password or API key)");
    console.log("  - SMTP_FROM       (e.g., Ashivam Technologies <no-reply@ashivam.com>)");
    console.log("  - ALERT_EMAIL     (e.g., hr@ashivam.com or contact@ashivam.com)");
    console.log("\n[Notice] The application operates safely in SIMULATED mode until configured.");
    return;
  }

  console.log("[Verifying] Testing SMTP socket connection and authentication handshake...");
  const verification = await verifyEmailTransport();

  if (verification.verified) {
    console.log("SUCCESS: SMTP connection and authentication handshake verified!");
    console.log("\n[Note on Delivery vs Authentication]");
    console.log("  * Transport verification proves your SMTP server accepts these credentials.");
    console.log("  * Actual inbox delivery also depends on domain DNS records (SPF, DKIM, DMARC)");
    console.log("    and recipient spam filter evaluation.");
  } else {
    console.error(`FAILURE: SMTP connection/authentication failed: ${verification.message}`);
    process.exitCode = 1;
    return;
  }

  // Parse test recipient from:
  // 1. --send-test <recipient>
  // 2. positional argument (e.g. node verify-smtp.js user@example.com)
  // 3. environment variable TEST_EMAIL_RECIPIENT
  let testRecipient = null;
  const sendTestArgIndex = process.argv.indexOf("--send-test");
  if (sendTestArgIndex !== -1 && process.argv[sendTestArgIndex + 1]) {
    testRecipient = process.argv[sendTestArgIndex + 1];
  } else if (process.argv[2] && !process.argv[2].startsWith("-")) {
    testRecipient = process.argv[2];
  } else if (process.env.TEST_EMAIL_RECIPIENT) {
    testRecipient = process.env.TEST_EMAIL_RECIPIENT;
  }

  if (testRecipient) {
    const cleanRecipient = sanitizeEmailHeader(testRecipient).toLowerCase();
    if (!EMAIL_REGEX.test(cleanRecipient)) {
      console.error(`ERROR: "${testRecipient}" is not a valid email address.`);
      process.exitCode = 1;
      return;
    }

    console.log("--------------------------------------------------");
    console.log(`[Test Dispatch] Sending single test email to: ${cleanRecipient}...`);
    try {
      const dispatch = await sendEmail({
        to: cleanRecipient,
        subject: `[SMTP Test] Ashivam Technologies SMTP Diagnostic — ${new Date().toISOString()}`,
        text: `This is a diagnostic verification email from Ashivam Technologies backend server.\nTimestamp: ${new Date().toISOString()}\nHost: ${env.smtpHost}\nPort: ${env.smtpPort}\n`,
        html: `
          <div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:8px;max-width:550px;">
            <h2 style="color:#0f172a;margin-top:0;">Ashivam Technologies — SMTP Verification</h2>
            <p>This is a live diagnostic verification email dispatched from the Ashivam Technologies backend.</p>
            <table style="width:100%;font-size:13px;color:#334155;">
              <tr><td><strong>Host:</strong></td><td>${env.smtpHost}</td></tr>
              <tr><td><strong>Port:</strong></td><td>${env.smtpPort}</td></tr>
              <tr><td><strong>Sender:</strong></td><td>${safeFrom}</td></tr>
              <tr><td><strong>Timestamp:</strong></td><td>${new Date().toISOString()}</td></tr>
            </table>
            <p style="margin-top:16px;color:#64748b;font-size:12px;">If you received this message, your SMTP credentials and network dispatch are functional.</p>
          </div>
        `,
      });

      if (dispatch.delivered) {
        console.log(`SUCCESS: Test email accepted by SMTP server! Message ID: ${dispatch.messageId}`);
        console.log("\n[Action Required for Verification]");
        console.log(`  * Check inbox: ${cleanRecipient}`);
        console.log("  * Check Spam/Junk folder if not visible in Primary within 2 minutes.");
        console.log("  * Real email delivery should only be marked as verified after confirming");
        console.log("    receipt in the actual recipient inbox.");
      } else {
        console.error(
          `FAILURE: Test email dispatch was not accepted: ${
            dispatch.error || dispatch.reason
          }`
        );
        process.exitCode = 1;
      }
    } catch (err) {
      console.error(`FAILURE: Unexpected error during test dispatch: ${err.message}`);
      process.exitCode = 1;
    }
  } else {
    console.log("--------------------------------------------------");
    console.log("[Test Email Dispatch] Skipped (No test recipient specified).");
    console.log("To send a live test message to an inbox, run:");
    console.log("  node src/scripts/verify-smtp.js --send-test recipient@example.com");
    console.log("or: npm run verify:smtp -- --send-test recipient@example.com");
  }
};

run().catch((err) => {
  console.error("FATAL: Unexpected diagnostic script error:", err.message);
  process.exitCode = 1;
});
