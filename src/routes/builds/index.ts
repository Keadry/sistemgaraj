import { Router } from 'express';
import coreRouter from './core.js';
import likesRouter from './likes.js';
import commentsRouter from './comments.js';
import editRequestsRouter from './editRequests.js';
import imagesRouter from './images.js';
import bookmarksRouter from './bookmarks.js';

const router = Router();

router.use(coreRouter);
router.use(likesRouter);
router.use(commentsRouter);
router.use(editRequestsRouter);
router.use(imagesRouter);
router.use(bookmarksRouter);

export default router;
