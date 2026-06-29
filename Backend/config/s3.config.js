const { S3Client } = require('@aws-sdk/client-s3');
const region = process.env.AWS_REGION || 'ap-southeast-2';

if (!process.env.AWS_REGION) {
  console.warn(
    `[s3.config] AWS_REGION is not set in .env — falling back to "${region}". ` +
      'Set AWS_REGION explicitly to silence this warning.',
  );
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = s3Client;
