/**
 * bullBoard.js
 * Visual dashboard for BullMQ queues.
 * Mounted at /admin/queues — shows active, waiting, completed, and failed jobs.
 * This is a powerful demo artifact — judges can see async processing in action.
 */
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { agentQueue } from './agentQueue.js';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(agentQueue)],
  serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();
