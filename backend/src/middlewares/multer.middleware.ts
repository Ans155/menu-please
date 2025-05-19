import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { XResponder } from '../controllers/x.response';
import logger from '../utils/logger';

export class MulterMiddleware {
    static async sizeLimitMiddleware(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        let totalSize = 0;
        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        if (files) {
            for (const key in files) {
                if (Object.prototype.hasOwnProperty.call(files, key)) {
                    totalSize += files[key].reduce(
                        (acc, file) => acc + file.size,
                        0,
                    );
                }
            }
        }

        if (totalSize > 100 * 1024 * 1024) {
            // 100 MB limit
            logger.error('FILE_SIZE_LIMIT_EXCEEDED_MULTER_MIDDLEWARE', {
                totalSize: totalSize,
                error_message: 'Total file size should not exceed 100 MB',
            });
            return XResponder.respond(
                res,
                400,
                null,
                'Total file size should not exceed 100 MB',
            );
        }
        next();
    }

    static async multerErrorHandler(
        err: Error,
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        if (err instanceof multer.MulterError) {
            // Handle multer-specific errors
            logger.error('MULTER_MIDDLEWARE_MULTER_ERROR', {
                error_message: err.message,
            });
            return XResponder.respond(res, 400, null, err.message);
        } else if (err) {
            // Handle other errors
            let errorMessage;
            try {
                errorMessage = JSON.parse(err.message).error;
            } catch {
                errorMessage = err.message;
            }
            logger.error('MULTER_MIDDLEWARE_ERROR', {
                error_message: errorMessage,
            });
            return XResponder.respond(res, 400, null, errorMessage);
        }
        next();
    }
}
