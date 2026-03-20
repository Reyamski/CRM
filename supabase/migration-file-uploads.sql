-- client_documents table
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
  ON client_documents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON client_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploader or Owner/Manager can delete documents"
  ON client_documents FOR DELETE
  TO authenticated USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('Broker / Owner', 'Manager / Compliance')
    )
  );
