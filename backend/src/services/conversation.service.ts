import {
    ConversationRepository,
    MessageRepository,
} from '../db/mongo/repository/conversation.repository';
import logger from '../utils/logger';
import {
    type ServiceError,
    type Feedback,
    type MessageContent,
    type Role,
} from './types';
import type {
    Conversation,
    Message,
} from '../db/mongo/repository/types/conversation.types';
import { ChatService } from './chat.service';

export class ConversationService {
    private static MESSAGE_HISTORY_LIMIT = 6;

    async createConversation(
        name: string,
        user_id?: string,
        summary?: string,
    ): Promise<Conversation | ServiceError> {
        try {
            return await ConversationRepository.createConversation({
                name,
                user_id,
                summary,
            });
        } catch (error) {
            logger.error('CREATE_CONVERSATION_ERROR', {
                error,
                name,
                user_id,
                summary,
            });
            return { message: 'INTERNAL_SERVER_ERROR', code: 500 };
        }
    }

    async getConversationsByUserId(
        userId: string,
    ): Promise<Conversation[] | ServiceError> {
        try {
            return await ConversationRepository.getConversationsByUserId(
                userId,
            );
        } catch (error) {
            logger.error('GET_CONVERSATIONS_ERROR', { error, userId });
            return { message: 'INTERNAL_SERVER_ERROR', code: 500 };
        }
    }

    async addMessageToConversation(
        conversation_id: string,
        content: MessageContent,
        role: Role,
        feedback: Feedback,
    ): Promise<Message | ServiceError> {
        try {
            return await MessageRepository.addMessage(
                conversation_id,
                content,
                role,
                feedback,
            );
        } catch (error) {
            logger.error('ADD_MESSAGE_ERROR', {
                error,
                conversation_id,
                content,
                role,
                feedback,
            });
            return { message: 'INTERNAL_SERVER_ERROR', code: 500 };
        }
    }

    async getMessagesByConversationId(
        conversationId: string,
    ): Promise<Message[] | ServiceError> {
        try {
            return await MessageRepository.getMessagesByConversationId(
                conversationId,
            );
        } catch (error) {
            logger.error('GET_MESSAGES_ERROR', { error, conversationId });
            return { message: 'INTERNAL_SERVER_ERROR', code: 500 };
        }
    }

    async updateMessage(
        conversation_id: string,
        message_id: string,
        feedback?: Feedback,
        content?: MessageContent,
    ): Promise<Message | ServiceError> {
        try {
            const updatedMessage = await MessageRepository.updateMessage({
                conversation_id,
                message_id,
                feedback,
                content,
            });

            if (!updatedMessage) {
                logger.error('UPDATE_MESSAGE_NOT_FOUND', {
                    conversation_id,
                    message_id,
                });
                return { message: 'MESSAGE_NOT_FOUND', code: 404 };
            }

            logger.info('MESSAGE_UPDATED_SUCCESSFULLY', {
                conversation_id,
                message_id,
            });
            return updatedMessage;
        } catch (error) {
            logger.error('UPDATE_MESSAGE_ERROR', {
                error,
                conversation_id,
                message_id,
                content,
                feedback,
            });
            return { message: 'INTERNAL_SERVER_ERROR', code: 500 };
        }
    }

    async deleteConversation(
        conversationId: string,
    ): Promise<number | ServiceError> {
        try {
            return await ConversationRepository.deleteConversation(
                conversationId,
            );
        } catch (error) {
            logger.error('DELETE_CONVERSATION_ERROR', {
                error,
                conversationId,
            });
            return { message: 'INTERNAL_SERVER_ERROR', code: 500 };
        }
    }

    static async getConversationHistory(
        conversationId: string,
    ): Promise<string | ServiceError> {
        try {
            const messages = await MessageRepository.getMessage(
                conversationId,
                ConversationService.MESSAGE_HISTORY_LIMIT,
            );
            const formattedMessages = messages
                .map((msg) => `${msg.role}: ${msg.content.message}`)
                .join('\n');

            return formattedMessages;
        } catch (error) {
            logger.error('GET_CONVERSATION_HISTORY_ERROR', {
                error,
                conversationId,
            });
            return { message: 'INTERNAL_SERVER_ERROR', code: 500 };
        }
    }

    async processMessageAndGenerateResponse(
        message: string,
        conversationId?: string,
        userId?: string,
    ): Promise<MessageContent | ServiceError> {
        try {
            logger.info('PROCESSING_USER_MESSAGE_AND_GENERATING_RESPONSE', {
                conversationId,
                messageLength: message.length,
            });

            let conversation: Conversation | ServiceError;

            // Create new conversation if not provided
            if (!conversationId) {
                logger.info('CREATING_NEW_CONVERSATION', { userId });
                conversation = await this.createConversation(
                    'New Chat',
                    userId,
                );
                if ('code' in conversation) {
                    logger.error('FAILED_TO_CREATE_CONVERSATION', {
                        error: conversation,
                    });
                    return {
                        message: 'FAILED_TO_CREATE_CONVERSATION',
                        code: 500,
                    };
                }
                conversationId = conversation._id.toString();
                logger.info('NEW_CONVERSATION_CREATED', { conversationId });
            } else {
                // Fetch existing conversation to confirm it exists
                const conversations =
                    await ConversationRepository.getConversationById(
                        conversationId,
                    );
                if (!conversations || conversations.length === 0) {
                    logger.error('CONVERSATION_NOT_FOUND', { conversationId });
                    return { message: 'CONVERSATION_NOT_FOUND', code: 404 };
                }
                conversation = conversations[0];
            }

            // Add user message to conversation
            const userMessageContent: MessageContent = { message };
            const emptyFeedback: Feedback = {};

            logger.info('ADDING_USER_MESSAGE', { conversationId });
            const userMessage = await this.addMessageToConversation(
                conversationId,
                userMessageContent,
                'user' as Role,
                emptyFeedback,
            );

            if ('code' in userMessage) {
                logger.error('FAILED_TO_ADD_USER_MESSAGE', {
                    error: userMessage,
                });
                return { message: 'FAILED_TO_ADD_USER_MESSAGE', code: 500 };
            }

            // Generate AI response
            logger.info('GENERATING_AI_RESPONSE', { conversationId });
            const chatService = new ChatService();
            const aiResponse = await chatService.generateAnswer(
                message,
                conversationId,
            );

            if (typeof aiResponse !== 'string' && 'code' in aiResponse) {
                logger.error('FAILED_TO_GENERATE_AI_RESPONSE', {
                    error: aiResponse,
                });
                return { message: 'FAILED_TO_GENERATE_AI_RESPONSE', code: 500 };
            }
            const aiMessage = await this.addMessageToConversation(
                conversationId,
                aiResponse,
                'ai' as Role,
                emptyFeedback,
            );
            if ('code' in aiMessage) {
                logger.error('FAILED_TO_ADD_AI_MESSAGE', { error: aiMessage });
                return { message: 'FAILED_TO_ADD_AI_MESSAGE', code: 500 };
            }

            logger.info('MESSAGE_PROCESSING_COMPLETED', {
                conversationId,
                userMessageId: userMessage._id.toString(),
                aiMessageId: aiMessage._id.toString(),
            });

            return aiResponse;
        } catch (error) {
            logger.error('PROCESS_MESSAGE_ERROR', { error });
            return { message: 'INTERNAL_SERVER_ERROR', code: 500 };
        }
    }
}
