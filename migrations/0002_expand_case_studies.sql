ALTER TABLE case_studies ADD COLUMN role TEXT;
ALTER TABLE case_studies ADD COLUMN cover_image_alt TEXT;
ALTER TABLE case_studies ADD COLUMN project_type TEXT;
ALTER TABLE case_studies ADD COLUMN intended_users TEXT;
ALTER TABLE case_studies ADD COLUMN platform TEXT;
ALTER TABLE case_studies ADD COLUMN project_status TEXT;
ALTER TABLE case_studies ADD COLUMN timeline TEXT;
ALTER TABLE case_studies ADD COLUMN content_sections TEXT NOT NULL DEFAULT '[]';
