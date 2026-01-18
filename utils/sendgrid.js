import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
    const msg = {
      to,
      from: process.env.SENDER_EMAIL || "umair.ansari.92@gmail.com", // Ensure this matches your verified sender
      subject,
      html,
    };
    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ SendGrid error:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
};

export const sendOtpEmail = async (email, otpCode) => {
  try {
    const templatePath = path.join(__dirname, "email.html");
    let htmlContent = fs.readFileSync(templatePath, "utf8");

    const appName = "LifeSync";
    const expiryMinutes = 15;
    const verifyUrl = `${process.env.CLIENT_URL}/verify-otp?email=${email}&otp=${otpCode}`;

    htmlContent = htmlContent
      .replace(/%APP_NAME%/g, appName)
      .replace(/%OTP_CODE%/g, otpCode)
      .replace(/%EXPIRY_MINUTES%/g, expiryMinutes)
      .replace(/%VERIFY_URL%/g, verifyUrl)
      .replace(/%USER_EMAIL%/g, email)
      .replace(/%COMPANY_ADDRESS%/g, "LifeSync Team");

    const subject = `${otpCode} is your ${appName} verification code`;

    await sendEmail(email, subject, htmlContent);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);
    throw error;
  }
};
