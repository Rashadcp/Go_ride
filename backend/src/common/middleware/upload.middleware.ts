import multer from "multer";
import { storage } from "../../config/s3";

export const upload = multer({ storage });
