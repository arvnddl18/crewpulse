-- Change default theme from dark to light for new profiles
ALTER TABLE profiles ALTER COLUMN theme SET DEFAULT 'light';

-- Update existing profiles that still have the old default
UPDATE profiles SET theme = 'light' WHERE theme = 'dark';
