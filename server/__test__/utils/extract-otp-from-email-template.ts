export const extractOtpFromEmailTemplate = (template: string) => {
  const regex = new RegExp(
    `\\b\\d{${parseInt(process.env.OTP_LENGTH!, 10)}}\\b`,
  );
  const match = template.match(regex);
  return match ? match[0] : null;
};
