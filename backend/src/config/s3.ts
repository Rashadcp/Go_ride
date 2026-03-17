import multerS3 from "multer-s3";
import dotenv from "dotenv";
import path from "path";

const { S3 } = require("@aws-sdk/client-s3");

dotenv.config();

const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || "eu-north-1";
const bucket = process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET_NAME || "goride-storage";
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey =
    process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
const endpoint = process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT;

const s3 = new S3({
    region,
    ...(endpoint ? { endpoint } : {}),
    credentials:
        accessKeyId && secretAccessKey
            ? {
                  accessKeyId,
                  secretAccessKey,
              }
            : undefined,
});

export const storage = multerS3({
    s3,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req: any, file: any, cb: any) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req: any, file: any, cb: any) {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "goride/" + file.fieldname + "-" + uniqueSuffix + ext);
    },
});

export { s3 };
