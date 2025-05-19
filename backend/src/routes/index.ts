import type { Application } from 'express';
import chatRoute from './chat.router'
import healthRoutes from './health.router';
import conversationRoutes from './conversations.route'
import menuRoutes from './menu.router'

export class Routes {
    static mountRoutes(app: Application) {
        app.use('/health', healthRoutes);
        app.use('/chat', chatRoute)
        app.use('/conversations',conversationRoutes)
        app.use('/menu', menuRoutes)
    }
}
