import 'dotenv/config';
import express from 'express';
import { router as webhooks } from './webhooks.js';
import { api } from './api.js';

const app = express();
app.use('/webhooks', webhooks); // BEFORE express.json(): it needs the raw body
app.use(express.json());
app.use('/api', api);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Pulse API on :${port}`));
