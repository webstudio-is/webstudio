-- to avoid some issues with backups we are using explicit schemas for "extensions" functions

UPDATE "Project" SET "domain"=extensions.uuid_generate_v4() WHERE "isDeleted" = true;