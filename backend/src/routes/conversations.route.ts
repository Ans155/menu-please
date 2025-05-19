import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller';

const router = Router();

router.post('/', ConversationController.createConversation);
router.get('/user/:userId', ConversationController.getConversations);
router.post('/add/message', ConversationController.addMessageToConversation);
router.get('/:conversationId/messages', ConversationController.getMessages);
router.put('/:conversationId/messages/:messageId', ConversationController.updateMessage);
router.delete('/:conversationId', ConversationController.deleteConversation);

export default router;



