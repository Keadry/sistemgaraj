import { Router } from 'express';
import { prisma } from '../db.js';
import { optionalAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/:username', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const username = req.params.username as string;

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, username: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    const isOwner = req.userId === user.id;

    const builds = await prisma.build.findMany({
      where: {
        userId: user.id,
        ...(isOwner ? {} : { isPublic: true }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        components: { include: { component: true } },
        likes: true,
        comments: { where: { status: 'APPROVED' } },
        images: { where: { status: 'APPROVED' }, orderBy: { order: 'asc' } },
      },
    });

    res.json({ user, builds, isOwner });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
