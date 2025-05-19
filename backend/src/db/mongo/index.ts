import { MongoClient } from 'mongodb';
import { config } from '../../../config';
import logger from '../../utils/logger';

class Database {
    private static instance: MongoClient | null = null;
    private static isInitialized: boolean = false;

    private constructor() {}

    private static async initializeInstance(): Promise<void> {
        if (!Database.isInitialized) {
            try {
                Database.instance = new MongoClient(config.database.mongo.uri || "");
                Database.isInitialized = true;
            } catch (error) {
                logger.error('FAILED_TO_CONNECT_MONGO_CLIENT', { error: (error as Error).message });
                throw error;
            }
        }
    }

    public static async getInstance(): Promise<MongoClient> {
        if (!Database.instance) {
            await Database.initializeInstance();
        }
        if (!Database.instance) {
            logger.error('MONGO_CLIENT_NOT_AVAILABLE');
            throw new Error('MongoDB client not available.');
        }
        return Database.instance;
    }

    public static async connect(): Promise<void> {
        if (!Database.instance) {
            await Database.getInstance();
        }
        try {
            logger.info('CONNECTING_TO_MONGO');
            await Database.instance?.connect();
            logger.info('CONNECTED_TO_MONGO');
        } catch (error) {
            logger.error('FAILED_TO_CONNECT_MONGO', { error: (error as Error).message });
            throw error;
        }
    }
}

export default Database;
