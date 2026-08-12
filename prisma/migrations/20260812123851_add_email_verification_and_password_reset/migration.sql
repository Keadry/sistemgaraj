-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- Bu satır elle eklendi ve şemadan üretilmedi.
--
-- Site 2026-08-07'de canlıya çıktı ve o günden beri kaydolan herkes
-- doğrulama diye bir şey olmadan kaydoldu. Varsayılan `false` olduğu için
-- bu sütun eklendiği anda mevcut kullanıcıların tamamı doğrulanmamış
-- sayılır ve yazma işlemleri kapanır — kendi hatalarından değil, kuralın
-- sonradan gelmesinden. Doğrulama yalnızca bu noktadan sonraki kayıtlar
-- için geçerli.
--
-- Damga `createdAt`'ten alınıyor: "ne zaman doğrulandı" sorusunun bu
-- kullanıcılar için dürüst cevabı "hesabın açıldığı an güvenilir kabul
-- edildi". now() yazmak, hepsinin migration anında doğrulandığı gibi
-- yanlış bir iz bırakırdı.
UPDATE "User" SET "emailVerified" = true, "emailVerifiedAt" = "createdAt";

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
