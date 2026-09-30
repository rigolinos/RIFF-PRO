-- Migration to add 'city' to sessions for geographic filtering
-- Data: 2026-10-27 (posterior to previous)

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS city TEXT;

-- Populate existing sessions with their organizer's city
UPDATE sessions s
SET city = p.city
FROM profiles p
WHERE s.professional_id = p.id AND s.city IS NULL;

-- Make it NOT NULL for future sessions (or leave it nullable if 'Anywhere' is possible? 
-- The briefing says "padrão: cidade do organizador", so it should always have a city).
-- But let's leave it nullable for backward compatibility just in case, or default to ''?
-- Leaving it nullable is safer, but we can update our insert query to include it.
