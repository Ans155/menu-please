import { Router } from 'express';
import { HealthController } from '../controllers';

const router = Router();

router.get('/', HealthController.getHealth);

export default router;