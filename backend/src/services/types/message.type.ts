
export interface MessageContent {
    message: string;
    suggestions?: Record<string, unknown>[];
}
export interface Feedback {
    upvote?:boolean,
    downvote?:boolean,
    text?:string

}
export enum Role {
    User = 'user',
    AI = 'ai',
    Admin = 'admin',
}
