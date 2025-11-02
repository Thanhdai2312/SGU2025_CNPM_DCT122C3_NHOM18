-- AlterTable
ALTER TABLE `drone` ADD COLUMN `currentStationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Drone_currentStationId_idx` ON `Drone`(`currentStationId`);

-- AddForeignKey
ALTER TABLE `Drone` ADD CONSTRAINT `Drone_currentStationId_fkey` FOREIGN KEY (`currentStationId`) REFERENCES `Restaurant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
