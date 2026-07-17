import { prisma } from '../db.js';

type EditRequestData = {
  id: string;
  description: string | null;
  cpuId: string | null;
  motherboardId: string | null;
  ramId: string | null;
  gpuId: string | null;
  psuId: string | null;
  caseId: string | null;
  storageId: string | null;
  images: { url: string; order: number }[];
  notes: { componentType: string; note: string }[];
};

// Bir düzenleme isteğinin değişikliklerini gerçek Build kaydına uygular.
// Hem otomatik onay (banned-word/görsel yoksa) hem admin onayı tarafından kullanılır.
export async function applyEditRequestChanges(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  buildId: string,
  editRequest: EditRequestData,
) {
  const build = await tx.build.findUnique({
    where: { id: buildId },
    include: { components: { include: { component: true } } },
  });

  if (!build) {
    throw new Error('Sistem bulunamadı.');
  }

  const currentByType: Record<string, string> = {};
  const currentNoteByType: Record<string, string | null> = {};
  for (const bc of build.components) {
    currentByType[bc.component.type] = bc.componentId;
    currentNoteByType[bc.component.type] = bc.note;
  }

  const finalIds: Record<string, string> = {
    CPU: editRequest.cpuId || currentByType['CPU'],
    MOTHERBOARD: editRequest.motherboardId || currentByType['MOTHERBOARD'],
    RAM: editRequest.ramId || currentByType['RAM'],
    GPU: editRequest.gpuId || currentByType['GPU'],
    PSU: editRequest.psuId || currentByType['PSU'],
    CASE: editRequest.caseId || currentByType['CASE'],
    STORAGE: editRequest.storageId || currentByType['STORAGE'],
  };

  const parts = await tx.component.findMany({
    where: { id: { in: Object.values(finalIds) } },
  });

  const totalPrice = parts.reduce((sum, p) => sum + p.price, 0);

  await tx.buildComponent.deleteMany({ where: { buildId } });

  for (const [type, componentId] of Object.entries(finalIds)) {
    const requestNote = editRequest.notes.find((n) => n.componentType === type);
    await tx.buildComponent.create({
      data: {
        buildId,
        componentId,
        note: requestNote
          ? requestNote.note
          : (currentNoteByType[type] ?? null),
        noteStatus: 'APPROVED',
      },
    });
  }

  await tx.build.update({
    where: { id: buildId },
    data: {
      totalPrice,
      description: editRequest.description ?? build.description,
      reviewStatus: 'APPROVED',
    },
  });

  const existingImageCount = await tx.buildImage.count({ where: { buildId } });

  for (let i = 0; i < editRequest.images.length; i++) {
    const img = editRequest.images[i];
    await tx.buildImage.create({
      data: {
        buildId,
        url: img.url,
        order: existingImageCount + i,
        status: 'APPROVED',
        isMain: existingImageCount === 0 && i === 0,
      },
    });
  }
}
