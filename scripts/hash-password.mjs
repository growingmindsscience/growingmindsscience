import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs '<password>'");
  process.exit(1);
}

const salt = randomBytes(16).toString("base64url");
const hash = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("base64url");

console.log(`GMS_LOGIN_PASSWORD_SALT=${salt}`);
console.log(`GMS_LOGIN_PASSWORD_HASH=${hash}`);
