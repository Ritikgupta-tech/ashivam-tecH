import env from "../config/env.js";
import {
  verifyEmailTransport,
  sendEmail,
  sanitizeEmailHeader,
  getSafeSmtpStatus,
} from "../modules/notification/email.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const run = async () => {
  console.log("==================================================");
  console.log("   ASHIVAM TECHNOLOGIES - EMAIL DIAGNOSTIC TOOL   ");
  console.log("==================================================");

  const safeFrom = env.smtpFrom || env.emailFrom;
  const safeAlert = env.alertEmail || env.notificationRecipient;
  const emailStatus = getSafeSmtpStatus();

  console.log(`Environment:           ${env.nodeEnv}`);
  console.log(`Active Provider:       ${emailStatus.provider.toUpperCase()}`);
  console.log(`Email Configured:      ${emailStatus.configured}`);
  console.log(`Trust Proxy:           ${env.trustProxy}`);
  console.log("--------------------------------------------------");
  console.log(
    `Resend API Key:        ${
      env.resendApiKey ? `[CONFIGURED: ${env.resendApiKey.substring(0, 5)}***]` : "(not set)"
    }`
  );
  console.log(
    `Brevo API Key:         ${
      env.brevoApiKey ? `[CONFIGURED: ${env.brevoApiKey.substring(0, 5)}***]` : "(not set)"
    }`
  );
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
  console.log(`Sender (From):         ${safeFrom}`);
  console.log(`Alert Recipient:       ${safeAlert || "(not set)"}`);
  console.log(
    `Timeouts (Connect/Sock):${env.smtpConnectionTimeoutMs}ms / ${env.smtpSocketTimeoutMs}ms`
  );
  console.log("--------------------------------------------------");

  if (!emailStatus.configured) {
    console.log("[Status] No email provider is fully configured in the current environment.");
    console.log("\nOption 1: Recommended for Render Cloud Containers (Bypasses SMTP port blocks):");
    console.log("  - RESEND_API_KEY      (e.g., re_xxxxxxxxxxxxxxxxxxxxxxxxx)");
    console.log("  - SMTP_FROM           (e.g., Ashivam Technologies <onboarding@resend.dev> or your verified domain)");
    console.log("  - ALERT_EMAIL         (e.g., hr@ashivamtechnologies.com)");
    console.log("\nOption 2: Direct SMTP (May time out on Render free tier if outbound ports 465/587 blocked):");
    console.log("  - SMTP_HOST           (e.g., smtp.gmail.com or smtp.sendgrid.net)");
    console.log("  - SMTP_PORT           (e.g., 587 or 465)");
    console.log("  - SMTP_USER           (e.g., your email or apikey)");
    console.log("  - SMTP_PASSWORD       (SMTP password or app password)");
    console.log("  - SMTP_FROM           (e.g., Ashivam Technologies <teamashivam@gmail.com>)");
    console.log("  - ALERT_EMAIL         (e.g., team.ashivam@gmail.com)");
    console.log("\n[Notice] The application operates safely in SIMULATED mode until configured.");
    return;
  }

  console.log(`[Verifying] Testing ${emailStatus.provider.toUpperCase()} connection & authentication handshake...`);
  const verification = await verifyEmailTransport();

  if (verification.verified) {
    console.log(`SUCCESS: ${emailStatus.provider.toUpperCase()} connection and authentication handshake verified!`);
    console.log("\n[Note on Delivery vs Authentication]");
    console.log(`  * Transport verification proves your ${emailStatus.provider.toUpperCase()} credentials are valid.`);
    console.log("  * Actual inbox delivery also depends on domain DNS records (SPF, DKIM, DMARC)");
    console.log("    and recipient spam filter evaluation.");
  } else {
    console.error(`FAILURE: ${emailStatus.provider.toUpperCase()} connection/authentication failed: ${verification.message}`);
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
    console.log(`[Test Dispatch] Sending single test email via ${emailStatus.provider.toUpperCase()} to: ${cleanRecipient}...`);
    try {
      const dispatch = await sendEmail({
        to: cleanRecipient,
        subject: `[Email Test] Ashivam Technologies Diagnostic — ${new Date().toISOString()}`,
        text: `This is a diagnostic verification email from Ashivam Technologies backend server.\nTimestamp: ${new Date().toISOString()}\nProvider: ${emailStatus.provider}\n`,
        html: `
          <div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:8px;max-width:550px;">
            <h2 style="color:#0f172a;margin-top:0;">Ashivam Technologies — Email Verification</h2>
            <p>This is a live diagnostic verification email dispatched from the Ashivam Technologies backend.</p>
            <table style="width:100%;font-size:13px;color:#334155;">
              <tr><td><strong>Provider:</strong></td><td>${emailStatus.provider.toUpperCase()}</td></tr>
              <tr><td><strong>Sender:</strong></td><td>${safeFrom}</td></tr>
              <tr><td><strong>Timestamp:</strong></td><td>${new Date().toISOString()}</td></tr>
            </table>
            <p style="margin-top:16px;color:#64748b;font-size:12px;">If you received this message, your email credentials and network dispatch are fully functional.</p>
          </div>
        `,
      });

      if (dispatch.delivered) {
        console.log(`SUCCESS: Test email accepted by ${emailStatus.provider.toUpperCase()}! Message ID: ${dispatch.messageId}`);
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
    console.log("  npm run verify:smtp -- --send-test recipient@example.com");
  }
};

run().catch((err) => {
  console.error("FATAL: Unexpected diagnostic script error:", err.message);
  process.exitCode = 1;
});
