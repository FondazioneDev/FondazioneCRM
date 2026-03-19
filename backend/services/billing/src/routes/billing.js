const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const CreditNote = require('../models/CreditNote');
const { verifyToken, requireBillingAccess } = require('../middleware/auth');
const { validate, createInvoiceSchema, updateInvoiceStatusSchema, invoiceFiltersSchema } = require('../middleware/validation');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

// Apply authentication middleware to all routes
router.use(verifyToken);
// TODO: Re-enable when permission system is implemented
// router.use(requireBillingAccess);

// GET /billing/invoices - Get all invoices with filters (Brief Test #15)
router.get('/invoices', async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = invoiceFiltersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filters',
        details: error.details.map(d => d.message)
      });
    }
    
    const filters = value;
    
    // Get invoices with filters
    const invoices = await Invoice.findAll(filters);
    
    // Get total count for pagination
    const totalResult = await Invoice.findAll({ 
      ...filters, 
      limit: undefined, 
      offset: undefined 
    });
    const total = totalResult.length;
    
    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        pages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching invoices'
    });
  }
});

// GET /billing/invoices/:id - Get specific invoice
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Fattura non trovata'
      });
    }
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching invoice'
    });
  }
});

// POST /billing/invoices - Create new invoice (Brief Test #14)
router.post('/invoices', validate(createInvoiceSchema), async (req, res) => {
  try {
    const invoiceData = req.body;
    
    // Create new invoice
    const invoice = await Invoice.create(invoiceData, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Fattura creata con successo',
      data: invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    
    // Handle specific errors
    if (error.message.includes('Paziente non trovato')) {
      return res.status(404).json({
        success: false,
        error: 'Paziente non trovato'
      });
    }
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Paziente non valido'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Errore nella creazione della fattura'
    });
  }
});

// PUT /billing/invoices/:id - Update invoice
router.put('/invoices/:id', validate(createInvoiceSchema), async (req, res) => {
  try {
    const invoiceData = req.body;
    
    // Update invoice
    const invoice = await Invoice.update(req.params.id, invoiceData, req.user.id);
    
    res.json({
      success: true,
      message: 'Fattura aggiornata con successo',
      data: invoice
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    
    if (error.message.includes('Fattura non trovata')) {
      return res.status(404).json({
        success: false,
        error: 'Fattura non trovata'
      });
    }
    
    if (error.message.includes('Paziente non trovato')) {
      return res.status(404).json({
        success: false,
        error: 'Paziente non trovato'
      });
    }
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Paziente non valido'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiornamento della fattura'
    });
  }
});

// PUT /billing/invoices/:id/status - Update invoice status (Brief Test #16)
router.put('/invoices/:id/status', validate(updateInvoiceStatusSchema), async (req, res) => {
  try {
    const { status, payment_date, payment_notes } = req.body;
    
    // Update invoice status
    const invoice = await Invoice.updateStatus(
      req.params.id, 
      status, 
      req.user.id, 
      payment_date, 
      payment_notes
    );
    
    res.json({
      success: true,
      message: 'Stato fattura aggiornato con successo',
      data: invoice
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    
    if (error.message.includes('Fattura non trovata')) {
      return res.status(404).json({
        success: false,
        error: 'Fattura non trovata'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiornamento dello stato fattura'
    });
  }
});

// GET /billing/invoices/:id/pdf - Generate and download invoice PDF (Brief Test #17)
router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Fattura non trovata'
      });
    }
    
    // Get company settings for PDF
    const companySettings = await Invoice.getCompanySettings();
    
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, companySettings);
    
    // Set headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Fattura_${invoice.invoice_number}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nella generazione del PDF'
    });
  }
});

// DELETE /billing/invoices/:id - Delete invoice (only for cancelled invoices)
router.delete('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Fattura non trovata'
      });
    }
    
    // Only allow deletion of cancelled invoices
    if (invoice.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Solo le fatture annullate possono essere eliminate'
      });
    }
    
    const deleted = await Invoice.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Fattura non trovata'
      });
    }
    
    res.json({
      success: true,
      message: 'Fattura eliminata con successo'
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'eliminazione della fattura'
    });
  }
});

// GET /billing/statistics - Get billing statistics
router.get('/statistics', async (req, res) => {
  try {
    const filters = req.query;
    const statistics = await Invoice.getStatistics(filters);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching billing statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching statistics'
    });
  }
});

// PUT /billing/invoices/overdue - Update overdue invoices (batch operation)
router.put('/invoices/overdue', async (req, res) => {
  try {
    const updatedInvoices = await Invoice.updateOverdueInvoices();
    
    res.json({
      success: true,
      message: `Updated ${updatedInvoices.length} overdue invoices`,
      data: updatedInvoices
    });
  } catch (error) {
    console.error('Error updating overdue invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating overdue invoices'
    });
  }
});

// POST /billing/invoices/:id/credit-notes - Get or create credit note
router.post('/invoices/:id/credit-notes', async (req, res) => {
  try {
    const invoiceId = req.params.id;

    // Check if credit note already exists (includes invoice data)
    const existing = await CreditNote.findByInvoiceId(invoiceId);

    if (existing) {
      return res.status(200).json({
        success: true,
        ...existing
      });
    }

    // Credit note doesn't exist, create it
    const creditNote = await CreditNote.create(invoiceId, req.user.id);
    const invoice = await Invoice.findById(invoiceId);

    return res.status(201).json({
      success: true,
      credit_note: creditNote,
      invoice: invoice
    });
  } catch (error) {
    console.error('Error creating credit note:', error);

    if (error.message.includes('Fattura non trovata')) {
      return res.status(404).json({
        success: false,
        error: 'Fattura non trovata'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore nella creazione della nota di credito'
    });
  }
});

// GET /billing/patients/search - Search patients for invoice creation
router.get('/patients/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query di ricerca troppo breve (minimo 2 caratteri)'
      });
    }
    
    // Search patients by name or CF (using patient service connection)
    const { query } = require('../utils/database');
    const result = await query(`
      SELECT id, nome, cognome, codice_fiscale,
             nome || ' ' || cognome as full_name
      FROM patient.patients 
      WHERE (
        LOWER(nome || ' ' || cognome) LIKE LOWER($1) OR
        LOWER(codice_fiscale) LIKE LOWER($1)
      )
      AND is_active = true
      ORDER BY cognome, nome
      LIMIT 20
    `, [`%${q}%`]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nella ricerca pazienti'
    });
  }
});

module.exports = router;