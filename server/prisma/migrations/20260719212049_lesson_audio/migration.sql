-- AlterTable
-- NOTE: this migration is timestamped BEFORE 20260719223445_courses (which
-- creates "Lesson"), so on a fresh database it runs first and must be a
-- no-op. Guarded with IF EXISTS/IF NOT EXISTS; the column is guaranteed on
-- fresh databases by 20260722221654_lesson_audio_fresh_db_ordering, which
-- runs after the table exists. Databases that applied the original
-- unguarded version (Detroit, Dwimbs) are unaffected — the net schema is
-- identical, and `prisma migrate deploy` does not re-check applied
-- migrations.
ALTER TABLE IF EXISTS "Lesson" ADD COLUMN IF NOT EXISTS "audioUrl" TEXT;
