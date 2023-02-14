-- CreateIndex
CREATE UNIQUE INDEX "Project_id_isDeleted_key" ON "Project"("id", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Project_domain_isDeleted_key" ON "Project"("domain", "isDeleted");
