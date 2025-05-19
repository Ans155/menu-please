import { Router } from 'express';
import { ChatController } from '../controllers';

const router = Router();

router.post('/', ChatController.chat);

export default router;


