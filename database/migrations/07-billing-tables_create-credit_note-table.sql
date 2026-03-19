CREATE TABLE IF NOT EXISTS billing.credit_notes (
    id SERIAL PRIMARY KEY,
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id INTEGER NOT NULL REFERENCES billing.invoices(id),
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON billing.credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_created_by ON billing.credit_notes(created_by);