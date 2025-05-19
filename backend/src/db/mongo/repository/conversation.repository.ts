import { ObjectId, type WithId, type Document } from 'mongodb';
import Database from '../index';
import type { Conversation, Message } from './types/conversation.types';
import type {
    ConversationDto,
    MessageContent,
    Role,
    Feedback,
} from '../../../services/types';
enum Collections {
    CONVERSATIONS = 'conversations',
    MESSAGES = 'messages',
}
interface Conversations extends WithId<Document> {
    user_id: ObjectId;
    name: string;
    summary: string;
    created_at: Date;
    updated_at: Date;
}

interface Messages extends WithId<Document> {
    conversation_id: ObjectId;
    content: MessageContent;
    role: Role;
    created_at: Date;
    updated_at: Date;
    feedback: Feedback;
}

interface UpdateMessageParams {
    conversation_id: string;
    message_id: string;
    feedback?: Feedback;
    content?: MessageContent;
}

class BaseRepository {
    protected static async getDb() {
        const dbName = 'one';
        const client = await Database.getInstance();
        return client.db(dbName);
    }
}

export class ConversationRepository extends BaseRepository {
    static async createConversation(
        Conversation: ConversationDto,
    ): Promise<Conversation> {
        const db = await this.getDb();
        const conversation = {
            name: Conversation.name,
            user_id: new ObjectId(Conversation.user_id),
            summary: Conversation.summary || '',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const result = await db
            .collection(Collections.CONVERSATIONS)
            .insertOne(conversation);
        return { ...conversation, _id: result.insertedId };
    }

    static async getConversationsByUserId(
        userId: string,
    ): Promise<Conversations[]> {
        const db = await this.getDb();

        const conversations: Conversations[] = await db
            .collection<Conversation>(Collections.CONVERSATIONS)
            .find({ user_id: new ObjectId(userId) })
            .toArray();

        return conversations;
    }

    static async updateConversation(
        conversationId: string,
        updateData: Partial<Omit<Conversation, '_id'>>,
    ): Promise<Conversation[] | null> {
        const db = await this.getDb();
        const result = await db
            .collection(Collections.CONVERSATIONS)
            .findOneAndUpdate(
                { _id: new ObjectId(conversationId) },
                { $set: { ...updateData, updated_at: new Date() } },
                { returnDocument: 'after' },
            );
        return result?.value;
    }

    static async getConversationById(
        conversationId: string,
    ): Promise<WithId<Document> | null> {
        const db = await this.getDb();
        return await db
            .collection(Collections.CONVERSATIONS)
            .findOne({ _id: new ObjectId(conversationId) });
    }

    static async deleteConversation(conversationId: string): Promise<number> {
        const db = await this.getDb();
        await MessageRepository.deleteMessagesByConversationId(conversationId);
        const result = await db
            .collection(Collections.CONVERSATIONS)
            .deleteOne({ _id: new ObjectId(conversationId) });
        return result?.deletedCount;
    }
}

export class MessageRepository extends BaseRepository {
    static async addMessage(
        conversation_id: string,
        content: MessageContent,
        role: Role,
        feedback: Feedback,
    ): Promise<Message> {
        const db = await this.getDb();
        const existingMessages = await db
            .collection(Collections.MESSAGES)
            .countDocuments({
                conversation_id: new ObjectId(conversation_id),
            });

        const message = {
            conversation_id: new ObjectId(conversation_id),
            content,
            role,
            feedback: feedback || {},
            created_at: new Date(),
            updated_at: new Date(),
        };

        const result = await db
            .collection(Collections.MESSAGES)
            .insertOne(message);

        if (existingMessages === 0) {
            let conversationName = content.message;
            if (conversationName.length > 30) {
                conversationName = conversationName.substring(0, 30) + '...';
            }
            await ConversationRepository.updateConversation(conversation_id, {
                name: conversationName,
            });
        }

        return { ...message, _id: result.insertedId };
    }

    static async getMessagesByConversationId(
        conversationId: string,
    ): Promise<Messages[]> {
        const db = await this.getDb();

        const messages: Messages[] = await db
            .collection<Message>(Collections.MESSAGES)
            .find({ conversation_id: new ObjectId(conversationId) })
            .toArray();

        return messages;
    }
    static async deleteMessagesByConversationId(conversationId: string) {
        const db = await this.getDb();
        const result = await db.collection(Collections.MESSAGES).deleteMany({
            conversation_id: new ObjectId(conversationId),
        });

        return result.deletedCount;
    }
    static async updateMessage(
        updateParams: UpdateMessageParams,
    ): Promise<Messages | null> {
        const db = await this.getDb();

        const result = await db
            .collection(Collections.MESSAGES)
            .findOneAndUpdate(
                {
                    _id: new ObjectId(updateParams.message_id),
                    conversation_id: new ObjectId(updateParams.conversation_id),
                },
                {
                    $set: {
                        ...(updateParams.content && {
                            content: updateParams.content,
                        }),
                        ...(updateParams.feedback && {
                            feedback: updateParams.feedback,
                        }),
                        updated_at: new Date(),
                    },
                },
                { returnDocument: 'after' },
            );

        return result as Messages | null;
    }

    static async getMessage(
        conversationId: string,
        limit?: number,
    ): Promise<Messages[]> {
        const db = await this.getDb();

        const messages: Messages[] = await db
            .collection<Message>(Collections.MESSAGES)
            .find({ conversation_id: new ObjectId(conversationId) })
            .sort({ created_at: 1 })
            .limit(limit || 6)
            .toArray();

        return messages;
    }
}
