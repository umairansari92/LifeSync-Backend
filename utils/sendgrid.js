import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendOtpEmail = async (email, firstName, otp) => {
  try {
    const msg = {
      to: email,
      from: "your_verified_email@example.com", // verified sender in SendGrid
      templateId: "d-ad9ccd3f5794436387bc2592aaa22e7b",
      dynamicTemplateData: {
        firstName,
        otp,
        year: new Date().getFullYear(),
      },
    };
    await sgMail.send(msg);
    console.log("✅ OTP email sent successfully to", email);
  } catch (error) {
    console.error("❌ SendGrid email error:", error);
    throw error;
  }
};
