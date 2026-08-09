import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth, type AuthRequest } from '../../middleware/auth.js';
import {
  validateBuild,
  checkRamSlotCompatibility,
  checkStorageSlotCompatibility,
} from '../../services/compatibility.js';
import {
  containsBannedWord,
  anyContainsBannedWord,
} from '../../services/moderation.js';
import { applyEditRequestChanges } from '../../services/buildEdits.js';
import { upload } from '../../upload.js';
import { verifyImageContents } from '../../middleware/image-content.js';
import { saveImages } from '../../storage.js';
import { getArray } from './shared.js';

const router = Router();

// ==============================
// DÜZENLEME İSTEĞİ OLUŞTUR (sadece sahibi)
// ==============================
router.post(
  '/:id/edit-request',
  requireAuth,
  upload.array('images', 5),
  verifyImageContents,
  async (req: AuthRequest, res) => {
    try {
      const buildId = req.params.id as string;

      const build = await prisma.build.findUnique({
        where: { id: buildId },
        include: { components: { include: { component: true } } },
      });

      if (!build) {
        res.status(404).json({ error: 'Sistem bulunamadı.' });
        return;
      }

      if (build.userId !== req.userId) {
        res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
        return;
      }

      const existingPending = await prisma.buildEditRequest.findFirst({
        where: { buildId, status: 'PENDING' },
      });

      if (existingPending) {
        res.status(409).json({
          error:
            'Bu sistem için zaten onay bekleyen bir düzenleme isteğin var.',
        });
        return;
      }

      const { name, description, cpuId, motherboardId, gpuId, psuId, caseId } =
        req.body;

      const ramIds = getArray(req.body.ramIds);
      const storageIds = getArray(req.body.storageIds);

      let notes: { componentType: string; note: string }[] = [];
      if (req.body.notes) {
        try {
          notes = JSON.parse(req.body.notes);
        } catch {
          notes = [];
        }
      }

      const hasPartChange =
        Boolean(cpuId) ||
        Boolean(motherboardId) ||
        Boolean(gpuId) ||
        Boolean(psuId) ||
        Boolean(caseId) ||
        ramIds.length > 0 ||
        storageIds.length > 0;

      if (hasPartChange) {
        const currentByType: Record<string, string> = {};
        const currentStorageIds: string[] = [];
        const currentRamIds: string[] = [];
        for (const bc of build.components) {
          if (bc.component.type === 'STORAGE') {
            currentStorageIds.push(bc.componentId);
          } else if (bc.component.type === 'RAM') {
            currentRamIds.push(bc.componentId);
          } else {
            currentByType[bc.component.type] = bc.componentId;
          }
        }

        const finalSingleIds = {
          cpuId: cpuId || currentByType['CPU'],
          motherboardId: motherboardId || currentByType['MOTHERBOARD'],
          gpuId: gpuId || currentByType['GPU'],
          psuId: psuId || currentByType['PSU'],
          caseId: caseId || currentByType['CASE'],
        };

        const finalRamIds = ramIds.length > 0 ? ramIds : currentRamIds;
        const finalStorageIds =
          storageIds.length > 0 ? storageIds : currentStorageIds;

        const allIds = [
          ...Object.values(finalSingleIds),
          ...finalRamIds,
          ...finalStorageIds,
        ];
        const parts = await prisma.component.findMany({
          where: { id: { in: allIds } },
        });

        if (parts.length !== allIds.length) {
          res
            .status(404)
            .json({ error: 'Bir veya birden fazla parça bulunamadı.' });
          return;
        }

        const findById = (id: string) => parts.find((c) => c.id === id)!;

        const result = validateBuild({
          cpu: findById(finalSingleIds.cpuId),
          motherboard: findById(finalSingleIds.motherboardId),
          ram: findById(finalRamIds[0]),
          gpu: findById(finalSingleIds.gpuId),
          psu: findById(finalSingleIds.psuId),
          pcCase: findById(finalSingleIds.caseId),
        });

        if (!result.isCompatible) {
          res.status(422).json({
            error: 'Önerdiğin parça kombinasyonu uyumlu değil.',
            issues: result.issues,
          });
          return;
        }

        const motherboard = findById(finalSingleIds.motherboardId);
        const pcCase = findById(finalSingleIds.caseId);
        const ramComponents = finalRamIds.map(findById);
        const storageComponents = finalStorageIds.map(findById);

        const slotIssues = [
          ...checkRamSlotCompatibility(motherboard, ramComponents.length),
          ...checkStorageSlotCompatibility(
            motherboard,
            pcCase,
            storageComponents,
          ),
        ];

        if (slotIssues.some((i) => i.level === 'error')) {
          res.status(422).json({
            error: 'Önerdiğin parça kombinasyonu uyumlu değil.',
            issues: slotIssues,
          });
          return;
        }
      }

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const hasImages = files.length > 0;

      const noteTexts = notes.map((n) => n.note);
      const descriptionBanned = description
        ? containsBannedWord(description)
        : false;
      const nameBanned = name ? containsBannedWord(name) : false;
      const hasBannedContent =
        anyContainsBannedWord(noteTexts) || descriptionBanned || nameBanned;

      const requiresReview = hasImages || hasBannedContent;

      // Görselleri kayıt oluşturmadan önce yüklüyoruz: depolama başarısız
      // olursa ortada görselsiz bir düzenleme talebi kalmasın.
      const imageUrls = await saveImages(files);

      const editRequest = await prisma.buildEditRequest.create({
        data: {
          buildId,
          status: requiresReview ? 'PENDING' : 'APPROVED',
          reviewedAt: requiresReview ? null : new Date(),
          name: name || null,
          description: description || null,
          cpuId: cpuId || null,
          motherboardId: motherboardId || null,
          gpuId: gpuId || null,
          psuId: psuId || null,
          caseId: caseId || null,
          ramIds,
          storageId: storageIds,
          images: {
            create: imageUrls.map((url, i) => ({
              url,
              order: i,
            })),
          },
          notes: {
            create: notes
              .filter((n) => n.note && n.note.trim().length > 0)
              .map((n) => ({
                componentType: n.componentType as any,
                note: n.note,
              })),
          },
        },
        include: { images: true, notes: true },
      });

      if (!requiresReview) {
        await prisma.$transaction(async (tx) => {
          await applyEditRequestChanges(tx, buildId, editRequest);
        });
      }

      res.status(201).json({
        message: requiresReview
          ? 'Düzenleme isteğin gönderildi, admin onayı bekleniyor.'
          : 'Değişikliklerin uygulandı.',
        requiresReview,
        editRequest,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// SİSTEMİN BEKLEYEN DÜZENLEME İSTEĞİNİ GETİR (sadece sahibi)
// ==============================
router.get('/:id/edit-request', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buildId = req.params.id as string;

    const build = await prisma.build.findUnique({ where: { id: buildId } });
    if (!build || build.userId !== req.userId) {
      res.status(403).json({ error: 'Bu işlem için yetkin yok.' });
      return;
    }

    const editRequest = await prisma.buildEditRequest.findFirst({
      where: { buildId, status: 'PENDING' },
      include: { images: true, notes: true },
    });

    res.json({ editRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
