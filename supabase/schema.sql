-- Notes table
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  icon TEXT NOT NULL DEFAULT '📝',
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_locked BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabs table
CREATE TABLE tabs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '탭 1',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks table
CREATE TABLE blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tab_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'code', 'tip', 'steps', 'table', 'checklist', 'file', 'keyword', 'flow', 'featurelist', 'keyvalue', 'list')),
  title TEXT,
  show_title BOOLEAN DEFAULT FALSE,
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Notes policies
CREATE POLICY "Users can manage own notes" ON notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can view all notes" ON notes FOR SELECT TO anon USING (true);

-- Tabs policies
CREATE POLICY "Note owner can manage tabs" ON tabs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = tabs.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Anon can view tabs" ON tabs FOR SELECT TO anon USING (true);

-- Blocks policies
CREATE POLICY "Note owner can manage blocks" ON blocks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM notes n JOIN tabs t ON t.note_id = n.id WHERE t.id = blocks.tab_id AND n.user_id = auth.uid()));
CREATE POLICY "Anon can view blocks" ON blocks FOR SELECT TO anon USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- =====================
-- documents (가이드 문서)
-- =====================
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- blocked_ips (IP 차단)
-- =====================
CREATE TABLE IF NOT EXISTS blocked_ips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT NOT NULL UNIQUE,
  reason     TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip);

-- anon 역할에 SELECT 권한 부여 (미들웨어에서 anon key로 IP 차단 여부 조회)
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anon can read blocked_ips" ON blocked_ips FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated can manage blocked_ips" ON blocked_ips FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- MIGRATION: Run this if the table already exists
-- ============================================================

-- Add documents table (가이드 문서 저장)
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add description column to existing documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- Add new block types to existing check constraint
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;
ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
  CHECK (type IN ('text','code','tip','steps','table','checklist','file','keyword','flow','featurelist','keyvalue','list','credential','license','link','poll','mindmap','embed','image','math','timer','ai_summary'));

-- note_history table (변경 사유 기록)
CREATE TABLE IF NOT EXISTS note_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE note_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own history" ON note_history
  FOR ALL USING (
    note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

-- note_comments table (노트 댓글)
CREATE TABLE IF NOT EXISTS note_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own comments" ON note_comments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Note owner can view comments" ON note_comments
  FOR SELECT TO authenticated USING (
    note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

-- Add deleted_at for trash (soft delete)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add user_id to notes (run this if table already exists)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS to allow user's own notes only
DROP POLICY IF EXISTS "Allow all for anon" ON notes;
DROP POLICY IF EXISTS "Allow all for anon" ON tabs;
DROP POLICY IF EXISTS "Allow all for anon" ON blocks;

CREATE POLICY IF NOT EXISTS "Users can manage own notes" ON notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Anon can view all notes" ON notes FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Note owner can manage tabs" ON tabs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = tabs.note_id AND notes.user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Anon can view tabs" ON tabs FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Note owner can manage blocks" ON blocks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM notes n JOIN tabs t ON t.note_id = n.id WHERE t.id = blocks.tab_id AND n.user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Anon can view blocks" ON blocks FOR SELECT TO anon USING (true);
