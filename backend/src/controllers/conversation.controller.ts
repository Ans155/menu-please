import type { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service';
import logger from '../utils/logger';
import { XResponder } from './x.response';
import type {
    Role,
    Feedback,
    MessageContent,
    ConversationDto,
} from '../services/types';

interface ControllerRequest {
    name: string;
    user_id: string;
    summary: string;
}

interface MessageRequest {
    conversation_id: string;
    content: MessageContent;
    role: Role;
    feedback: Feedback;
}

export class ConversationController {
    static async createConversation(
        req: Request,
        res: Response,
    ): Promise<Response> {
        try {
            const createControllerRequest = req.body as ConversationDto;
            const conversationService = new ConversationService();
            const conversation = await conversationService.createConversation(
                createControllerRequest.name,
                createControllerRequest.user_id,
                createControllerRequest.summary,
            );

            if ('code' in conversation) {
                logger.error('CREATE_CONVERSATION_ERROR', {
                    error_message: conversation.message,
                });
                return XResponder.respond(
                    res,
                    conversation.code,
                    null,
                    conversation.message,
                );
            }

            logger.info('CONVERSATION_CREATED', { createControllerRequest });
            return XResponder.respond(res, 201, conversation);
        } catch (error) {
            logger.error('CREATE_CONVERSATION_ERROR', (error as Error).message);
            return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
        }
    }

    static async getConversations(
        req: Request,
        res: Response,
    ): Promise<Response> {
        try {
            const userId = req.params.userId;
            const conversationService = new ConversationService();
            const conversations =
                await conversationService.getConversationsByUserId(userId);

            if ('code' in conversations) {
                logger.error('GET_CONVERSATIONS_ERROR', {
                    error_message: conversations.message,
                });
                return XResponder.respond(
                    res,
                    conversations.code,
                    null,
                    conversations.message,
                );
            }

            logger.info('CONVERSATIONS_RETRIEVED_SUCCESSFULLY', {
                conversations,
            });
            return XResponder.respond(res, 200, { conversations });
        } catch (error) {
            logger.error('GET_CONVERSATIONS_ERROR', (error as Error).message);
            return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
        }
    }

    static async addMessageToConversation(
        req: Request,
        res: Response,
    ): Promise<Response> {
        try {
            const messageRequest = req.body as MessageRequest;
            const conversationService = new ConversationService();
            const message = await conversationService.addMessageToConversation(
                messageRequest.conversation_id,
                messageRequest.content,
                messageRequest.role,
                messageRequest.feedback,
            );

            if ('code' in message) {
                logger.error('ADD_MESSAGE_ERROR', {
                    error_message: message.message,
                });
                return XResponder.respond(
                    res,
                    message.code,
                    null,
                    message.message,
                );
            }

            logger.info('MESSAGE_ADDED_SUCCESSFULLY', { message });
            return XResponder.respond(res, 201, message);
        } catch (error) {
            logger.error('ADD_MESSAGE_ERROR', (error as Error).message);
            return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
        }
    }

    static async getMessages(req: Request, res: Response): Promise<Response> {
        try {
            const conversationId = req.params.conversationId;
            const conversationService = new ConversationService();
            const messages =
                await conversationService.getMessagesByConversationId(
                    conversationId,
                );

            if ('code' in messages) {
                logger.error('GET_MESSAGE_ERROR', {
                    error_message: messages.message,
                });
                return XResponder.respond(
                    res,
                    messages.code,
                    null,
                    messages.message,
                );
            }

            logger.info('MESSAGES_RETRIEVED_SUCCESSFULLY', { conversationId });
            return XResponder.respond(res, 200, { messages });
        } catch (error) {
            logger.error('GET_MESSAGES_ERROR', (error as Error).message);
            return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
        }
    }

    static async updateMessage(req: Request, res: Response): Promise<Response> {
        try {
            const updateMessageRequest = req.body as Partial<MessageRequest>;
            const conversationId = req.params.conversationId;
            const messageId = req.params.messageId;
            const conversationService = new ConversationService();

            const updatedMessage = await conversationService.updateMessage(
                conversationId,
                messageId,
                updateMessageRequest.feedback,
                updateMessageRequest.content,
            );

            if ('code' in updatedMessage) {
                logger.error('UPDATE_MESSAGE_ERROR', {
                    error_message: updatedMessage.message,
                });
                return XResponder.respond(
                    res,
                    updatedMessage.code,
                    null,
                    updatedMessage.message,
                );
            }

            logger.info('MESSAGE_UPDATED_SUCCESSFULLY', { updatedMessage });
            return XResponder.respond(res, 200, updatedMessage);
        } catch (error) {
            logger.error('UPDATE_MESSAGE_ERROR', (error as Error).message);
            return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
        }
    }

    static async deleteConversation(
        req: Request,
        res: Response,
    ): Promise<Response> {
        try {
            const conversationId = req.params.conversationId;
            const conversationService = new ConversationService();
            const result =
                await conversationService.deleteConversation(conversationId);

            if (typeof result !== 'number' && 'code' in result) {
                logger.error('DELETE_CONVERSATION_ERROR', {
                    error_message: result.message,
                });
                return XResponder.respond(
                    res,
                    result.code,
                    null,
                    result.message,
                );
            }

            if (result) {
                logger.info('CONVERSATION_DELETED_SUCCESSFULLY', {
                    conversationId,
                });
                return XResponder.respond(res, 200, {
                    message: 'CONVERSATION_DELETED_SUCCESSFULLY',
                });
            } else {
                logger.warn('CONVERSATION_NOT_FOUND', { conversationId });
                return XResponder.respond(
                    res,
                    404,
                    null,
                    'CONVERSATION_NOT_FOUND',
                );
            }
        } catch (error) {
            logger.error('DELETE_CONVERSATION_ERROR', (error as Error).message);
            return XResponder.respond(res, 500, null, 'INTERNAL_SERVER_ERROR');
        }
    }
}
