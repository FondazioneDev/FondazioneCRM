const { query } = require('../utils/database');
const moment = require('moment');

class CreditNote {
  constructor(data) {
    this.id = data.id;
    this.credit_note_number = data.credit_note_number;
    this.invoice_id = data.invoice_id;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Generate next credit note number based on current year
  static async generateCreditNoteNumber() {
    const year = moment().format('YYYY');
    const result = await query(
      `SELECT credit_note_number 
       FROM billing.credit_notes 
       WHERE credit_note_number LIKE $1
       ORDER BY credit_note_number DESC
       LIMIT 1`,
      [`INV-${year}-%/NC`]
    );
    
    let nextNum = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].credit_note_number;
      const numberPart = lastNumber.split('-')[2];
      nextNum = parseInt(numberPart, 10) + 1;
    }
    
    return `INV-${year}-${nextNum.toString().padStart(3, '0')}/NC`;
  }

  // Create new credit note following brief requirements
  static async create(invoice_id, createdBy) {
    try {
      // Get patient information for the credit note
      const invoiceResult = await query(
        'SELECT * FROM billing.invoices WHERE id = $1',
        [invoice_id]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error('Fattura non trovata');
      }

      // Generate credit note number
      const creditNoteNumber = await this.generateCreditNoteNumber();

      const queryText = `
        INSERT INTO billing.credit_notes (
          credit_note_number, invoice_id, created_by
        ) VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [
        creditNoteNumber,
        invoice_id,
        createdBy
      ];

      const result = await query(queryText, values);
      return new CreditNote(result.rows[0]);
    } catch (error) {
      console.error('Error creating credit note:', error);
      throw error;
    }
  }

  // Get credit note by invoice ID - returns both credit_note and invoice
  static async findByInvoiceId(invoiceId) {
    const result = await query(
      `SELECT cn.id, cn.credit_note_number, cn.invoice_id,
              cn.created_by, cn.created_at, cn.updated_at,
              u.username as created_by_username,
              i.id as inv_id, i.invoice_number, i.patient_id, i.patient_name,
              i.patient_cf, i.description, i.amount, i.stamp_duty_amount,
              i.stamp_duty_applied, i.total_amount, i.payment_method,
              i.status, i.issue_date, i.payment_date,
              i.payment_notes, i.created_by as inv_created_by,
              i.created_at as inv_created_at, i.updated_at as inv_updated_at
       FROM billing.credit_notes cn
       LEFT JOIN billing.invoices i ON cn.invoice_id = i.id
       LEFT JOIN auth.users u ON cn.created_by = u.id
       WHERE cn.invoice_id = $1`,
      [invoiceId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    return {
      credit_note: new CreditNote({
        id: row.id,
        credit_note_number: row.credit_note_number,
        invoice_id: row.invoice_id,
        created_by: row.created_by,
        created_by_username: row.created_by_username,
        created_at: row.created_at,
        updated_at: row.updated_at
      }),
      invoice: {
        id: row.inv_id,
        invoice_number: row.invoice_number,
        patient_id: row.patient_id,
        patient_name: row.patient_name,
        patient_cf: row.patient_cf,
        description: row.description,
        amount: row.amount,
        stamp_duty_amount: row.stamp_duty_amount,
        stamp_duty_applied: row.stamp_duty_applied,
        total_amount: row.total_amount,
        payment_method: row.payment_method,
        status: row.status,
        issue_date: row.issue_date,
        due_date: row.due_date,
        payment_date: row.payment_date,
        payment_notes: row.payment_notes
      }
    };
  }
}

module.exports = CreditNote;