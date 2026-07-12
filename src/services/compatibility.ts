import type { Component } from '../generated/prisma/client.js';

// ==============================
// TİPLER
// ==============================

export type CompatibilityIssue = {
  level: 'error' | 'warning';
  message: string;
};

export type CompatibilityResult = {
  isCompatible: boolean;
  issues: CompatibilityIssue[];
};

// Anakart form faktörü büyüklük sıralaması.
// Bir kasa, kendi büyüklüğüne EŞİT veya KÜÇÜK anakartları barındırabilir.
// (örn: ATX kasa -> ATX de Micro-ATX de sığar. Micro-ATX kasa -> ATX SIĞMAZ)
const FORM_FACTOR_SIZE: Record<string, number> = {
  'Mini-ITX': 1,
  'Micro-ATX': 2,
  ATX: 3,
};

// ==============================
// 1) SOKET UYUMU (CPU <-> Anakart)
// ==============================
export function checkSocketCompatibility(
  cpu: Component,
  motherboard: Component,
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  if (!cpu.socket || !motherboard.socket) {
    issues.push({
      level: 'error',
      message: 'CPU veya anakartın soket bilgisi eksik.',
    });
    return issues;
  }

  if (cpu.socket !== motherboard.socket) {
    issues.push({
      level: 'error',
      message: `Soket uyumsuzluğu: CPU (${cpu.socket}) ile anakart (${motherboard.socket}) birbiriyle çalışmaz.`,
    });
  }

  return issues;
}

// ==============================
// 2) RAM NESLİ UYUMU (Anakart <-> RAM)
// ==============================
export function checkRamCompatibility(
  motherboard: Component,
  ram: Component,
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  if (!motherboard.ramType || !ram.ramType) {
    issues.push({
      level: 'error',
      message: "Anakart veya RAM'in bellek tipi bilgisi eksik.",
    });
    return issues;
  }

  if (motherboard.ramType !== ram.ramType) {
    issues.push({
      level: 'error',
      message: `RAM nesli uyumsuzluğu: Anakart (${motherboard.ramType}) ile RAM (${ram.ramType}) uyuşmuyor.`,
    });
  }

  return issues;
}

// ==============================
// 3) GÜÇ YETERLİLİĞİ (CPU + GPU <-> PSU)
// ==============================
export function checkPowerCompatibility(
  cpu: Component,
  gpu: Component,
  psu: Component,
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  if (!cpu.wattage || !gpu.wattage || !psu.wattage) {
    issues.push({
      level: 'error',
      message: "CPU, GPU veya PSU'nun watt bilgisi eksik.",
    });
    return issues;
  }

  // Anakart, RAM, depolama, fanlar için sabit bir taban tüketim varsayıyoruz.
  const BASE_SYSTEM_WATTAGE = 100;
  const totalRequired = cpu.wattage + gpu.wattage + BASE_SYSTEM_WATTAGE;

  // Güvenli kullanım için %20 payla önerilen güç.
  const recommended = Math.ceil(totalRequired * 1.2);

  if (psu.wattage < totalRequired) {
    issues.push({
      level: 'error',
      message: `PSU yetersiz: Sistem yaklaşık ${totalRequired}W çekiyor ama PSU sadece ${psu.wattage}W sağlıyor.`,
    });
  } else if (psu.wattage < recommended) {
    issues.push({
      level: 'warning',
      message: `PSU sınırda: Sistem çalışır ama güvenli pay için en az ${recommended}W önerilir (mevcut: ${psu.wattage}W).`,
    });
  }

  return issues;
}

// ==============================
// 4) FİZİKSEL UYUM (Kasa <-> Anakart)
// ==============================
export function checkCaseCompatibility(
  pcCase: Component,
  motherboard: Component,
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  if (!pcCase.formFactor || !motherboard.formFactor) {
    issues.push({
      level: 'error',
      message: 'Kasa veya anakartın boyut bilgisi eksik.',
    });
    return issues;
  }

  const caseSize = FORM_FACTOR_SIZE[pcCase.formFactor];
  const boardSize = FORM_FACTOR_SIZE[motherboard.formFactor];

  if (caseSize === undefined || boardSize === undefined) {
    issues.push({
      level: 'error',
      message: `Tanınmayan form faktörü: kasa (${pcCase.formFactor}) veya anakart (${motherboard.formFactor}).`,
    });
    return issues;
  }

  if (boardSize > caseSize) {
    issues.push({
      level: 'error',
      message: `Fiziksel uyumsuzluk: ${motherboard.formFactor} anakart, ${pcCase.formFactor} kasaya sığmaz.`,
    });
  }

  return issues;
}

// ==============================
// HEPSİ BİR ARADA: TAM SİSTEM KONTROLÜ
// ==============================
export function validateBuild(parts: {
  cpu: Component;
  motherboard: Component;
  ram: Component;
  gpu: Component;
  psu: Component;
  pcCase: Component;
}): CompatibilityResult {
  const { cpu, motherboard, ram, gpu, psu, pcCase } = parts;

  const issues: CompatibilityIssue[] = [
    ...checkSocketCompatibility(cpu, motherboard),
    ...checkRamCompatibility(motherboard, ram),
    ...checkPowerCompatibility(cpu, gpu, psu),
    ...checkCaseCompatibility(pcCase, motherboard),
  ];

  const hasError = issues.some((issue) => issue.level === 'error');

  return {
    isCompatible: !hasError,
    issues,
  };
}
