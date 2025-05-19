import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller';
import multer, { type FileFilterCallback } from 'multer';
import { MulterMiddleware } from '../middlewares';

const router = Router();

const storage = multer.diskStorage({
    destination: '../uploads',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
) => {
    const allowedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
    ];
    const allowedAudioTypes = ['audio/mpeg'];
    const allowedVideoTypes = ['video/mp4'];
    const allowedDocumentTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
        'application/vnd.ms-excel', // Excel
        'application/msword', // Word
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word
    ];

    if (
        allowedImageTypes.includes(file.mimetype) ||
        allowedAudioTypes.includes(file.mimetype) ||
        allowedVideoTypes.includes(file.mimetype) ||
        allowedDocumentTypes.includes(file.mimetype)
    ) {
        cb(null, true);
    } else {
        cb(
            new Error(
                JSON.stringify({
                    error: 'Only .jpg, .webp, .png, .heic, .mp3, .mp4, .pdf, .doc, .docx, and .xls files are allowed',
                }),
            ) as unknown as null,
            false,
        );
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter as unknown as undefined,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB file size limit
});

router.post(
    '/upload',
    upload.fields([{ name: 'menu', maxCount: 1 }]),
    MenuController.uploadMenu,
);

export default router;
