import { prisma } from '../db.js';

type EditRequestData = {
  id: string;
  name: string | null;
  description: string | null;
  cpuId: string | null;
  motherboardId: string | null;
  ramId: string | null;
  gpuId: string | null;
  psuId: string | null;
  caseId: string | null;
  storageId: string[];
  images: { url: string; order: number }[];
  notes: { componentType: string; note: string }[];
};

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
  const currentStorageId: string[] = [];

  for (const bc of build.components) {
    if (bc.component.type === 'STORAGE') {
      currentStorageId.push(bc.componentId);
    } else {
      currentByType[bc.component.type] = bc.componentId;
    }
    currentNoteByType[bc.component.type] = bc.note;
  }

  const finalSingleIds: Record<string, string> = {
    CPU: editRequest.cpuId || currentByType['CPU'],
    MOTHERBOARD: editRequest.motherboardId || currentByType['MOTHERBOARD'],
    RAM: editRequest.ramId || currentByType['RAM'],
    GPU: editRequest.gpuId || currentByType['GPU'],
    PSU: editRequest.psuId || currentByType['PSU'],
    CASE: editRequest.caseId || currentByType['CASE'],
  };

  const finalStorageIds =
    editRequest.storageId.length > 0 ? editRequest.storageId : currentStorageId;

  const allComponentIds = [
    ...Object.values(finalSingleIds),
    ...finalStorageIds,
  ];

  const parts = await tx.component.findMany({
    where: { id: { in: allComponentIds } },
  });

  const totalPrice = parts.reduce((sum, p) => sum + p.price, 0);

  await tx.buildComponent.deleteMany({ where: { buildId } });

  for (const [type, componentId] of Object.entries(finalSingleIds)) {
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

  const storageNote = editRequest.notes.find(
    (n) => n.componentType === 'STORAGE',
  );

  for (let i = 0; i < finalStorageIds.length; i++) {
    await tx.buildComponent.create({
      data: {
        buildId,
        componentId: finalStorageIds[i],
        // Not sadece ilk depolama parçasına iliştirilir (birden fazla depolama için basit bir yaklaşım)
        note:
          i === 0
            ? storageNote
              ? storageNote.note
              : (currentNoteByType['STORAGE'] ?? null)
            : null,
        noteStatus: 'APPROVED',
      },
    });
  }

  await tx.build.update({
    where: { id: buildId },
    data: {
      totalPrice,
      name: editRequest.name ?? build.name,
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
