import type { Response } from 'express';
import logger from '../utils/logger';

interface XResponse {
    success: boolean;
    data: unknown;
    error: {
        message: string | null;
    };
}

export class XResponder {
    public static respond(
        res: Response,
        statusCode: number,
        data: unknown = null,
        errorMessage: string | null = null,
    ): Response {
        if (!statusCode) {
            logger.error('X_RESPONDER_ERROR', {
                error: 'STATUS_CODE_NOT_PROVIDED',
            });
            res.status(500).json({
                success: false,
                data: null,
                error: {
                    message: 'Internal Server Error',
                },
            });
        }
        return res.status(statusCode).json({
            success: !errorMessage,
            data: data,
            error: {
                message: errorMessage,
            },
        } as XResponse);
    }
}