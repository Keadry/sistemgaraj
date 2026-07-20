import 'dotenv/config';

import { PrismaClient, ComponentType } from './generated/prisma/client.js';

const prisma = new PrismaClient();

const components = [
  // ==================== CPU ====================
  {
    name: 'Ryzen 5 7600',
    brand: 'AMD',
    type: ComponentType.CPU,
    price: 6699,
    socket: 'AM5',
    wattage: 65,
  },
  {
    name: 'Ryzen 7 7700X',
    brand: 'AMD',
    type: ComponentType.CPU,
    price: 12999,
    socket: 'AM5',
    wattage: 105,
  },
  {
    name: 'Ryzen 5 5600',
    brand: 'AMD',
    type: ComponentType.CPU,
    price: 3299,
    socket: 'AM4',
    wattage: 65,
  },
  {
    name: 'Core i5-14400F',
    brand: 'Intel',
    type: ComponentType.CPU,
    price: 6999,
    socket: 'LGA1700',
    wattage: 65,
  },
  {
    name: 'Core i5-13400F',
    brand: 'Intel',
    type: ComponentType.CPU,
    price: 5999,
    socket: 'LGA1700',
    wattage: 65,
  },

  // ==================== ANAKART ====================
  {
    name: 'Prime B650M-K',
    brand: 'Asus',
    type: ComponentType.MOTHERBOARD,
    price: 5915,
    socket: 'AM5',
    ramType: 'DDR5',
    formFactor: 'Micro-ATX',
    ramSlots: 4,
    m2Slots: 2,
  },
  {
    name: 'B650M DS3H',
    brand: 'Gigabyte',
    type: ComponentType.MOTHERBOARD,
    price: 5499,
    socket: 'AM5',
    ramType: 'DDR5',
    formFactor: 'Micro-ATX',
    ramSlots: 4,
    m2Slots: 2,
  },
  {
    name: 'PRO B650M-E',
    brand: 'MSI',
    type: ComponentType.MOTHERBOARD,
    price: 6199,
    socket: 'AM5',
    ramType: 'DDR5',
    formFactor: 'Micro-ATX',
    ramSlots: 4,
    m2Slots: 2,
  },
  {
    name: 'Prime B760M-K',
    brand: 'Asus',
    type: ComponentType.MOTHERBOARD,
    price: 4499,
    socket: 'LGA1700',
    ramType: 'DDR4',
    formFactor: 'Micro-ATX',
    ramSlots: 4,
    m2Slots: 1,
  },
  {
    name: 'B550M DS3H',
    brand: 'Gigabyte',
    type: ComponentType.MOTHERBOARD,
    price: 2799,
    socket: 'AM4',
    ramType: 'DDR4',
    formFactor: 'Micro-ATX',
    ramSlots: 2,
    m2Slots: 1,
  },

  // ==================== RAM ====================
  {
    name: 'Vengeance 16GB (2x8) 6000MHz',
    brand: 'Corsair',
    type: ComponentType.RAM,
    price: 2799,
    ramType: 'DDR5',
  },
  {
    name: 'Fury Beast 32GB (2x16) 6000MHz',
    brand: 'Kingston',
    type: ComponentType.RAM,
    price: 5499,
    ramType: 'DDR5',
  },
  {
    name: 'Vengeance LPX 16GB (2x8) 3200MHz',
    brand: 'Corsair',
    type: ComponentType.RAM,
    price: 1799,
    ramType: 'DDR4',
  },
  {
    name: 'Trident Z5 32GB (2x16) 6000MHz',
    brand: 'G.Skill',
    type: ComponentType.RAM,
    price: 6499,
    ramType: 'DDR5',
  },

  // ==================== EKRAN KARTI ====================
  {
    name: 'Dual RTX 5060 OC 8GB',
    brand: 'Asus',
    type: ComponentType.GPU,
    price: 17999,
    wattage: 170,
  },
  {
    name: 'RTX 5060 Ti Ventus 2X OC 8GB',
    brand: 'MSI',
    type: ComponentType.GPU,
    price: 24399,
    wattage: 180,
  },
  {
    name: 'RTX 5060 Ti Eagle OC 16GB',
    brand: 'Gigabyte',
    type: ComponentType.GPU,
    price: 31999,
    wattage: 180,
  },
  {
    name: 'Pulse RX 9060 XT 16GB',
    brand: 'Sapphire',
    type: ComponentType.GPU,
    price: 25999,
    wattage: 220,
  },
  {
    name: 'Dual RTX 5070 OC 12GB',
    brand: 'Asus',
    type: ComponentType.GPU,
    price: 33999,
    wattage: 250,
  },

  // ==================== GÜÇ KAYNAĞI (PSU) ====================
  {
    name: 'CV550 550W 80+ Bronze',
    brand: 'Corsair',
    type: ComponentType.PSU,
    price: 2199,
    wattage: 550,
  },
  {
    name: 'VX PLUS 650W',
    brand: 'Aerocool',
    type: ComponentType.PSU,
    price: 1799,
    wattage: 650,
  },
  {
    name: 'RM750e 750W 80+ Gold',
    brand: 'Corsair',
    type: ComponentType.PSU,
    price: 4499,
    wattage: 750,
  },
  {
    name: 'Toughpower GF1 850W 80+ Gold',
    brand: 'Thermaltake',
    type: ComponentType.PSU,
    price: 6499,
    wattage: 850,
  },

  // ==================== KASA ====================
  // ==================== KASA ====================
  // ==================== KASA ====================
  {
    name: 'DLM21 Micro-ATX',
    brand: 'Darkflash',
    type: ComponentType.CASE,
    price: 1499,
    formFactor: 'Micro-ATX',
    sataSlots: 2,
  },
  {
    name: 'H510 ATX',
    brand: 'NZXT',
    type: ComponentType.CASE,
    price: 4499,
    formFactor: 'ATX',
    sataSlots: 3,
  },
  {
    name: 'Lancool 215 ATX',
    brand: 'Lian Li',
    type: ComponentType.CASE,
    price: 4999,
    formFactor: 'ATX',
    sataSlots: 4,
  },
  {
    name: 'MasterBox Q300L Micro-ATX',
    brand: 'Cooler Master',
    type: ComponentType.CASE,
    price: 2199,
    formFactor: 'Micro-ATX',
    sataSlots: 2,
  },

  // ==================== DEPOLAMA ====================
  {
    name: '870 EVO 1TB SATA SSD',
    brand: 'Samsung',
    type: ComponentType.STORAGE,
    price: 2199,
  },
  {
    name: '980 1TB NVMe M.2 SSD',
    brand: 'Samsung',
    type: ComponentType.STORAGE,
    price: 2799,
  },
  {
    name: 'NV2 1TB NVMe M.2 SSD',
    brand: 'Kingston',
    type: ComponentType.STORAGE,
    price: 2299,
  },
  {
    name: 'Barracuda 1TB SATA SSD',
    brand: 'Seagate',
    type: ComponentType.STORAGE,
    price: 1899,
  },
];

async function main() {
  console.log('🌱 Seed işlemi başlıyor...');

  for (const component of components) {
    await prisma.component.create({ data: component });
  }

  console.log(`✅ ${components.length} parça başarıyla eklendi!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed sırasında hata oluştu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
