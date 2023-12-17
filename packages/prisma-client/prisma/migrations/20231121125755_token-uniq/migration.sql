-- CreateIndex
CREATE UNIQUE INDEX "AuthorizationToken_token_key" ON "AuthorizationToken"("token");
-- AddForeignKey
ALTER TABLE "AuthorizationToken" ADD CONSTRAINT "AuthorizationToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
