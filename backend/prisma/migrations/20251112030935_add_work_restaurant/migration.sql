-- AlterTable
ALTER TABLE `user` ADD COLUMN `workRestaurantId` VARCHAR(191) NULL,
    MODIFY `role` ENUM('CUSTOMER', 'ADMIN', 'RESTAURANT') NOT NULL DEFAULT 'CUSTOMER';

-- CreateIndex
CREATE INDEX `User_role_workRestaurantId_idx` ON `User`(`role`, `workRestaurantId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_workRestaurantId_fkey` FOREIGN KEY (`workRestaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
