-- Repairs migration ordering for fresh databases: 20260719212049_lesson_audio
-- sorts before 20260719223445_courses (which creates "Lesson"), so on a fresh
-- database the audioUrl column was never added (lesson_audio is now a guarded
-- no-op there). This migration runs after the table exists and guarantees the
-- column on every database; on Detroit/Dwimbs (column already present) it is
-- a no-op.
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "audioUrl" TEXT;
