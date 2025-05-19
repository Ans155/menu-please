import type { Request, Response } from 'express';

import { MenuService } from '../services/menu.service';
import { XResponder } from './x.response';
import logger from '../utils/logger';
import fs from 'fs';

export class MenuController {
    static async uploadMenu(req: Request, res: Response): Promise<Response> {
        try {
            // Check if file exists in the request
            if (!req.files) {
                logger.error('NO_FILE_UPLOADED');
                return XResponder.respond(res, 400, null, 'No file uploaded');
            }
            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };
            const filePath = files.menu?.[0].path;
            logger.info('MENU_FILE_UPLOADED', {
                filepath: filePath,
            });
            // Process the menu image
            const menuService = new MenuService();
            const processedMenu = await menuService.processMenuImage(filePath);

            if ('code' in processedMenu) {
                logger.error('MENU_PROCESSING_ERROR', {
                    error_message: processedMenu.message,
                });
                return XResponder.respond(
                    res,
                    processedMenu.code,
                    null,
                    processedMenu.message,
                );
            }

            // Log the processed menu data
            console.log(
                'PROCESSED_MENU_DATA:',
                JSON.stringify(processedMenu, null, 2),
            );

            logger.info('MENU_PROCESSED_SUCCESSFULLY', {
                itemsCount: processedMenu.length,
            });

            return XResponder.respond(res, 200, { menuItems: processedMenu });
        } catch (error) {
            logger.error('MENU_UPLOAD_ERROR', {
                error: (error as Error).message,
            });
            return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
        }
    }

    /**
     * Uploads and processes a menu image directly with Gemini Vision model
     * @param req - Express request object
     * @param res - Express response object
     * @returns Response with processed menu items
     */
    // static async uploadMenuWithGeminiVision(req: Request, res: Response): Promise<Response> {
    //     try {
    //         // Check if file exists in the request
    //         if (!req.files) {
    //             logger.error('NO_FILE_UPLOADED');
    //             return XResponder.respond(res, 400, null, 'No file uploaded');
    //         }
    //         const files = req.files as {
    //             [fieldname: string]: Express.Multer.File[];
    //         };
    //         const filePath = files.menu?.[0].path;
    //         logger.info('MENU_FILE_UPLOADED_FOR_GEMINI_VISION', {
    //             filepath: filePath,
    //         });

    //         // Process the menu image with Gemini Vision
    //         const menuService = new MenuService();
    //         const processedMenu = await menuService.processMenuWithGeminiVision(filePath);

    //         if ('code' in processedMenu) {
    //             logger.error('GEMINI_VISION_PROCESSING_ERROR', {
    //                 error_message: processedMenu.message,
    //             });
    //             return XResponder.respond(
    //                 res,
    //                 processedMenu.code,
    //                 null,
    //                 processedMenu.message,
    //             );
    //         }

    //         logger.info('MENU_PROCESSED_WITH_GEMINI_VISION_SUCCESSFULLY', {
    //             itemsCount: processedMenu.length,
    //         });

    //         return XResponder.respond(res, 200, { menuItems: processedMenu });
    //     } catch (error) {
    //         logger.error('GEMINI_VISION_MENU_UPLOAD_ERROR', {
    //             error: (error as Error).message,
    //         });
    //         return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
    //     }
    // }
}
