import express, { type Request } from 'express';
import { Routes } from './routes';
import { config } from '../config';
import Database from './db/mongo';
import logger from './utils/logger';
import cors from 'cors';
import bodyParser from 'body-parser';

//config
const port = config.server.port;

// express application
const app = express();

// middleware
// app.use(bodyParser.json({ limit: '50mb' }));
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use(cors<Request>());

async function main(): Promise<void> {
    try {
        Routes.mountRoutes(app);
        await Database.connect()
        app.listen(port, () => {
            logger.info('SERVER_RUNNING_ON_PORT',{ port });
        });
    } catch (error) {
        logger.error('ERROR_STARTING_SERVER', error);
        process.exit(1);
    }
}

main();