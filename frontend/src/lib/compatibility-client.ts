import type { Component } from '@/lib/api';

export const FORM_FACTOR_SIZE: Record<string, number> = {
  'Mini-ITX': 1,
  'Micro-ATX': 2,
  ATX: 3,
};

export type PartialSelection = {
  cpuId?: string | null;
  motherboardId?: string | null;
  caseId?: string | null;
};

/**
 * Bir parçanın mevcut CPU/Anakart/Kasa seçimleriyle neden uyumsuz olduğunu
 * kullanıcıya gösterilebilecek bir cümle olarak döndürür. Uyumluysa null.
 *
 * Sebebi ayrı döndürmek bilinçli: uyumsuz parçayı listeden silmek yerine
 * soluk gösterip nedenini yazabiliyoruz. "Neden bu işlemciyi göremiyorum"
 * sorusunun cevabı arayüzde duruyor.
 */
export function getIncompatibilityReason(
  component: Component,
  selection: PartialSelection,
  ramTypeSelected: string | null,
  components: Component[],
): string | null {
  const byId = (id: string | null | undefined) =>
    id ? (components.find((c) => c.id === id) ?? null) : null;

  const cpu = byId(selection.cpuId);
  const motherboard = byId(selection.motherboardId);
  const pcCase = byId(selection.caseId);

  if (component.type === 'CPU' && motherboard) {
    if (component.socket !== motherboard.socket) {
      return `Anakartın ${motherboard.socket} soketli, bu işlemci ${component.socket}`;
    }
  }

  if (component.type === 'MOTHERBOARD') {
    if (cpu && component.socket !== cpu.socket) {
      return `İşlemcin ${cpu.socket} soketli, bu anakart ${component.socket}`;
    }
    if (ramTypeSelected && component.ramType !== ramTypeSelected) {
      return `Seçtiğin RAM ${ramTypeSelected}, bu anakart ${component.ramType} kullanıyor`;
    }
    if (pcCase && component.formFactor && pcCase.formFactor) {
      if (
        FORM_FACTOR_SIZE[component.formFactor] >
        FORM_FACTOR_SIZE[pcCase.formFactor]
      ) {
        return `${component.formFactor} anakart ${pcCase.formFactor} kasana sığmaz`;
      }
    }
  }

  if (component.type === 'CASE' && motherboard) {
    if (component.formFactor && motherboard.formFactor) {
      if (
        FORM_FACTOR_SIZE[motherboard.formFactor] >
        FORM_FACTOR_SIZE[component.formFactor]
      ) {
        return `${motherboard.formFactor} anakartın bu ${component.formFactor} kasaya sığmaz`;
      }
    }
  }

  return null;
}

/**
 * Bir parçanın, mevcut CPU/Anakart/Kasa seçimleriyle ve seçilen RAM tipiyle
 * uyumlu olup olmadığını kontrol eder. Hem "Sistem Topla" hem "Sistemi
 * Düzenle" ekranlarında aynı mantığı kullanmak için ortak fonksiyon.
 */
export function isCompatible(
  component: Component,
  selection: PartialSelection,
  ramTypeSelected: string | null,
  components: Component[],
): boolean {
  return (
    getIncompatibilityReason(component, selection, ramTypeSelected, components) === null
  );
}
