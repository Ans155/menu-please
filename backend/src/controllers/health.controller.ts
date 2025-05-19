import type { Request, Response } from 'express';

export class HealthController {
    static async getHealth(_req: Request, res: Response) {
        res.status(200).json({ message: 'Service is up and running' });
    }
}