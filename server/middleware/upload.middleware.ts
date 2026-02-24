import multer from "multer";
import { storage, fileFilter } from "../config/upload.config";

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
});
