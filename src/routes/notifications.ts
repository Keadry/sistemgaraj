import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

/** Çan bir seferde bu kadar gösteriyor; gerisi "tümünü gör" sayfasının işi. */
const PAGE_SIZE = 20;

// ==============================
// BİLDİRİMLER + OKUNMAMIŞ SAYISI
// ==============================
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const offset = req.query.offset
      ? parseInt(req.query.offset as string, 10)
      : 0;

    /* Liste ve sayaç tek turda: çan her sayfa yüklemesinde ikisini de
       istiyor, ayrı ayrı sorgulamak fonksiyon–veritabanı gecikmesini iki
       katına çıkarırdı. */
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        skip: offset,
        include: {
          actor: { select: { id: true, username: true, avatarUrl: true } },
          build: { select: { id: true, name: true } },
          /* Parça, bildirimin kendisinde değil yorumunda duruyor: iki yerde
             tutulsa ikisinin ayrışması mümkün olurdu. Bildirim metni
             istemcide türden üretildiği için parçanın adı da oradan
             okunuyor — adı bildirime kopyalamak, parça yeniden
             adlandırıldığında eski bildirimleri yanlış bırakırdı. */
          comment: {
            select: {
              id: true,
              component: { select: { brand: true, name: true, type: true } },
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId: req.userId!, isRead: false },
      }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// TÜMÜNÜ OKUNDU İŞARETLE
// ==============================
router.patch('/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'Tümü okundu olarak işaretlendi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// TEK BİLDİRİMİ OKUNDU İŞARETLE
// ==============================
router.patch('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    /* `updateMany` + userId koşulu bilinçli: `update` ile id'ye göre
       güncellemek, başkasının bildirimini okundu yapmaya izin verirdi.
       Burada sahibi olmayan bir id sessizce sıfır satır etkiliyor. */
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id as string, userId: req.userId! },
      data: { isRead: true },
    });

    if (result.count === 0) {
      res.status(404).json({ error: 'Bildirim bulunamadı.' });
      return;
    }

    res.json({ message: 'Okundu olarak işaretlendi.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
