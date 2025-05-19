import type { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import logger from '../utils/logger';
import { XResponder } from './x.response';
import { ConversationService } from '../services/conversation.service';

export class ChatController {
    static async chat(req: Request, res: Response) {
        const question = req.body.question;
        const coversationId = req.body.conversationId;
        try {
            const chatService = new ConversationService();
            const answer = await chatService.processMessageAndGenerateResponse(
                question,
                coversationId,
            );
            if (typeof answer !== 'string' && 'code' in answer) {
                logger.error('CREATOR_API_RESPONSE_ERROR', {
                    error_message: answer,
                });
                return XResponder.respond(
                    res,
                    answer.code,
                    null,
                    answer.message,
                );
            }
            logger.info('CHAT_API_SUCCESS', { answer });
            return XResponder.respond(res, 200, answer);
        } catch (error) {
            logger.error('CHAT_API_ERROR', { error: (error as Error).message });
            return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
        }
    }
}
