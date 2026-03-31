"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3 = exports.storage = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const client_s3_1 = require("@aws-sdk/client-s3");
dotenv_1.default.config();
const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || "eu-north-1";
const bucket = process.env.AWS_BUCKET_NAME || "goride-storage";
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const s3 = new client_s3_1.S3Client({
    region,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
    },
});
exports.s3 = s3;
const multer_s3_1 = __importDefault(require("multer-s3"));
const path_1 = __importDefault(require("path"));
exports.storage = (0, multer_s3_1.default)({
    s3,
    bucket,
    contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        let folder = "goride/others/";
        if (file.fieldname === "profilePhoto")
            folder = "goride/profiles/";
        else if (file.fieldname === "vehiclePhotos" || file.fieldname === "vehiclePhoto")
            folder = "goride/vehicles/";
        else if (["license", "rc", "aadhaar", "doc"].includes(file.fieldname))
            folder = "goride/documents/";
        cb(null, folder + file.fieldname + "-" + uniqueSuffix + ext);
    },
});
