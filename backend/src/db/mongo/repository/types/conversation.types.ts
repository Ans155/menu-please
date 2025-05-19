import { ObjectId } from 'mongodb';
import type { MessageContent, Role, Feedback } from '../../../../services/types';
export interface Conversation {
    _id: ObjectId; 
    name: string;
    user_id: ObjectId;
    summary: string;
    created_at: Date;
    updated_at: Date;
}


export interface Message {
    _id:ObjectId;
    conversation_id: ObjectId;
    content: MessageContent;
    role: Role;
    feedback: Feedback;
    created_at: Date;
    updated_at: Date;
}
