import { Router } from 'express';
import { validate } from '../middleware/validate.ts';
import { requireAuth } from '../middleware/authenticate.ts';
import { chatRateLimiter } from '../middleware/rate-limit.ts';
import { chatSchema, conversationIdParams } from '../validators/chatbot.validator.ts';
import {
  chatController,
  listConversationsController,
  getConversationController,
} from '../chatbot/chatbot.controller.ts';

export const chatbotRoutes = Router();

chatbotRoutes.use(requireAuth);

// Chat is rate-limited to 30 messages/minute/user (§3.3).
chatbotRoutes.post('/', chatRateLimiter, validate({ body: chatSchema }), chatController);
chatbotRoutes.get('/conversations', listConversationsController);
chatbotRoutes.get('/conversations/:id', validate({ params: conversationIdParams }), getConversationController);
