import { Router } from 'express';
import { getMessages, searchMessages, getMentions, clearMention, editMessage, deleteMessage, toggleReaction, togglePin } from '../controllers/messageController.js';
import auth from '../middleware/auth.js';
import membership from '../middleware/membership.js';

const router = Router();

router.get('/user/mentions', auth, getMentions);
router.delete('/:messageId/mentions', auth, clearMention);
router.get('/:conversationId', auth, membership, getMessages);
router.put('/:id', auth, editMessage);
router.delete('/:id', auth, deleteMessage);
router.post('/:id/react', auth, toggleReaction);
router.post('/:id/pin', auth, togglePin);
router.get('/:conversationId/search', auth, membership, searchMessages);

export default router;
