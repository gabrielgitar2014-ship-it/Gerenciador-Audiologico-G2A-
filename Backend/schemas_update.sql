-- Adicionar coluna para salvar o Relatório Epidemiológico
CREATE TABLE IF NOT EXISTS epidemiological_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    year VARCHAR(4) NOT NULL,
    report_text TEXT NOT NULL,
    generated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
