-- Make age_range, ethnicity, and interaction_quality nullable to allow quick interaction logging
ALTER TABLE public.interactions 
  ALTER COLUMN age_range DROP NOT NULL,
  ALTER COLUMN ethnicity DROP NOT NULL,
  ALTER COLUMN interaction_quality DROP NOT NULL;