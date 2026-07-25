const DRAFT_KEY = 'sistemgaraj_build_draft';

export type BuildDraft = {
  name: string;
  isPublic: boolean;
  cpuId: string | null;
  motherboardId: string | null;
  gpuId: string | null;
  psuId: string | null;
  caseId: string | null;
  ramIds: string[];
  storageIds: string[];
};

export function saveDraft(draft: BuildDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage kullanılamıyorsa (gizli sekme vb.) sessizce geç
  }
}

export function loadDraft(): BuildDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BuildDraft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // yoksay
  }
}

export function hasDraftContent(draft: BuildDraft): boolean {
  return (
    Boolean(draft.name) ||
    Boolean(draft.cpuId) ||
    Boolean(draft.motherboardId) ||
    Boolean(draft.gpuId) ||
    Boolean(draft.psuId) ||
    Boolean(draft.caseId) ||
    draft.ramIds.length > 0 ||
    draft.storageIds.length > 0
  );
}
