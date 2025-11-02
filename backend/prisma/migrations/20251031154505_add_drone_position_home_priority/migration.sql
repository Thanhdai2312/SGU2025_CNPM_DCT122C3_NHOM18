/*
  Warnings:

  - The values [OPERATOR] on the enum `User_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `drone` ADD COLUMN `currentLat` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `currentLng` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `homeStationId` VARCHAR(191) NULL,
    ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER';

-- CreateIndex
CREATE INDEX `Drone_homeStationId_idx` ON `Drone`(`homeStationId`);

-- CreateIndex
CREATE INDEX `Drone_priority_idx` ON `Drone`(`priority`);

-- AddForeignKey
ALTER TABLE `Drone` ADD CONSTRAINT `Drone_homeStationId_fkey` FOREIGN KEY (`homeStationId`) REFERENCES `Restaurant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
