import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * Yüklenen görselleri saklayan katman.
 *
 * İki sağlayıcı var ve seçim ortam değişkenlerine bakılarak yapılıyor:
 *
 *  - **Supabase Storage** — üretim. Sunucusuz ortamlarda dosya sistemi
 *    salt-okunur ve geçici olduğu için diske yazmak mümkün değil.
 *  - **Yerel disk** — Supabase değişkenleri tanımlı değilse devreye giriyor.
 *    Böylece Supabase hesabı olmadan da geliştirme yapılabiliyor.
 *
 * Her iki durumda da dönen değer görselin **tam adresi** değil, veritabanına
 * yazılacak referanstır: Supabase'de mutlak URL, yerelde `/uploads/...`.
 * Frontend ikisini de anlıyor (bkz. `lib/image-url.ts`), böylece sağlayıcı
 * değişince eski kayıtlar bozulmuyor.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? 'images';

export const isRemoteStorage = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

const supabase = isRemoteStorage
  ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
      auth: { persistSession: false },
    })
  : null;

const uploadDir = path.join(process.cwd(), 'uploads');

/** Dosya adını istemciden gelen isme göre üretmiyoruz: özgün ad `../` gibi
 *  yol parçaları veya çakışan isimler içerebilir. Uzantıyı MIME'dan türetip
 *  gövdeyi rastgele üretmek ikisini de kapatıyor. */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function buildObjectName(mimetype: string): string {
  const extension = EXTENSION_BY_MIME[mimetype] ?? 'bin';
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
}

/**
 * Görseli saklar ve veritabanına yazılacak referansı döndürür.
 *
 * multer bellek modunda çalıştığı için dosya `file.buffer` içinde geliyor.
 */
export async function saveImage(file: Express.Multer.File): Promise<string> {
  const objectName = buildObjectName(file.mimetype);

  if (supabase) {
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(objectName, file.buffer, {
        contentType: file.mimetype,
        // Adlar rastgele üretiliyor, üzerine yazma senaryosu yok. Kapalı
        // bırakmak, beklenmedik bir çakışmayı sessizce yutmak yerine hata
        // olarak görmemizi sağlıyor.
        upsert: false,
      });

    if (error) {
      throw new Error(`Görsel yüklenemedi: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(objectName);

    return data.publicUrl;
  }

  await fs.promises.mkdir(uploadDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadDir, objectName), file.buffer);
  return `/uploads/${objectName}`;
}

/** Birden çok görsel için; sıra korunur. */
export async function saveImages(
  files: Express.Multer.File[],
): Promise<string[]> {
  return Promise.all(files.map((file) => saveImage(file)));
}

/**
 * Görseli depolamadan siler. Referansın biçimine bakarak nereye ait olduğuna
 * kendisi karar veriyor; veritabanında hem eski yerel yollar hem yeni mutlak
 * URL'ler bulunabildiği için bu şart.
 *
 * Temizlik işlemi olduğu için hata fırlatmıyor — silinemeyen bir dosya
 * yüzünden kullanıcının isteği başarısız olmamalı. Ama sessizce de geçmiyor:
 * yetim dosyalar loglanmazsa fark edilmeden birikir.
 */
export async function deleteImage(url: string): Promise<void> {
  if (!url) return;

  if (url.startsWith('http')) {
    if (!supabase) return;

    // Genel URL biçimi: <proje>/storage/v1/object/public/<bucket>/<nesne>
    const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) {
      console.error(`Silinemedi, beklenmeyen görsel adresi: ${url}`);
      return;
    }

    const objectName = decodeURIComponent(
      url.slice(markerIndex + marker.length),
    );
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([objectName]);

    if (error) {
      console.error(`Görsel silinemedi (${objectName}): ${error.message}`);
    }
    return;
  }

  const relativePath = url.startsWith('/') ? url.slice(1) : url;
  await fs.promises
    .unlink(path.join(process.cwd(), relativePath))
    .catch(() => {
      // Dosya zaten yoksa sorun değil — silinmesini istiyorduk, yok.
    });
}

/** Sırayla değil paralel siler; hepsi bağımsız temizlik işlemleri. */
export async function deleteImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map((url) => deleteImage(url)));
}
