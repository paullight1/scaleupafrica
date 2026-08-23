-- The profile-media policies are defined in the initial storage migration;
-- create the bucket they protect so profile uploads work in fresh projects.
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-media', 'profile-media', true)
ON CONFLICT (id) DO NOTHING;
