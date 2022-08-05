import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
let env = dotenv.config().parsed || {};

try {
  const res = dotenv.config({ path: ".env.local" });
  if (res.parsed) {
    env = { ...env, ...res.parsed };
  }
} catch {
  console.log(".env.local not found, using .env");
}

const s3Client = new S3Client({
  region: env.REGION,
  credentials: {
    accessKeyId: env.ACCESS_KEY_ID,
    secretAccessKey: env.SECRET_ACCESS_KEY,
  },
  endpoint: env.OBJECT_STORAGE_ENDPOINT,
});
export { s3Client, env };
