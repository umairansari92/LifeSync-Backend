import fs from "fs";
import path from "path";

const filePath = path.resolve("utils", "email.html");
const template = fs.readFileSync(filePath, "utf8");

export function generateOtpEmail(options) {
  let html = template;

  Object.keys(options).forEach(key => {
    const placeholder = new RegExp(`%${key.toUpperCase()}%`, "g");
    html = html.replace(placeholder, options[key]);
  });

  return html;
}
