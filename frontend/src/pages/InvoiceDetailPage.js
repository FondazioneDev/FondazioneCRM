import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Container,
  useTheme,
  alpha,
  Skeleton,
  Stack,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Euro as EuroIcon,
  Calendar as CalendarIcon,
  Payment as PaymentIcon,
  Download as DownloadIcon,
  CheckCircle as PaidIcon,
  Schedule as PendingIcon,
  Cancel as OverdueIcon,
  NoteAdd as NoteAddIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { billingService, patientService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { generateInvoicePDF, generateCreditNotePDF } from '../services/pdfServiceSimple';

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billingService.getInvoice(id);
      setInvoice(response.data);
      
      // Fetch patient details for PDF generation
      if (response.data.patient_id) {
        const patientResponse = await patientService.getPatient(response.data.patient_id);
        setPatient(patientResponse.patient);
      }
    } catch (error) {
      console.error('Errore nel caricamento della fattura:', error);
      setError('Errore nel caricamento della fattura');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    navigate(`/billing/${id}/edit`);
    handleMenuClose();
  };

  const handleDownloadPDF = async () => {
    try {
      if (!patient) {
        setError('Dati paziente non disponibili per la generazione PDF');
        return;
      }

      // Convert invoice data to the format expected by generateInvoicePDF
      const invoiceData = {
        ...invoice,
        description: invoice.description,
        amount: invoice.amount,
        payment_method: invoice.payment_method,
        issue_date: invoice.issue_date,
        invoice_number:invoice.invoice_number,
      };

      const result = generateInvoicePDF(invoiceData, patient);
      if (result.success) {
        console.log('PDF generato con successo:', result.fileName);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Errore nel download del PDF');
    }
    handleMenuClose();
  };

  const handleFindOrCreateCreditNote = async () => {
    try {
      setLoading(true);

      if (!patient) {
        setError('Dati paziente non disponibili per la generazione PDF');
        return;
      }

      const response = await billingService.createCreditNote(invoice.id);

      const result = generateCreditNotePDF(response.credit_note, response.invoice, patient);
      if (result.success) {
        console.log('PDF generato con successo:', result.fileName);
      }

    } catch (error) {
      console.error("Error creating invoice:", error);
      console.error("Error response:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: 'success',
      pending: 'warning',
      overdue: 'error',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      paid: <PaidIcon />,
      pending: <PendingIcon />,
      overdue: <OverdueIcon />
    };
    return icons[status] || <PendingIcon />;
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: 'Pagato',
      pending: 'In attesa',
      overdue: 'Scaduto',
      cancelled: 'Annullato'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/billing')}
          variant="outlined"
        >
          Torna alle Fatture
        </Button>
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Fattura non trovata</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/billing')}
            variant="outlined"
          >
            Indietro
          </Button>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            Fattura {invoice.invoice_number}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {invoice.status !== 'pending' && (
            <Chip
              icon={getStatusIcon(invoice.status)}
              label={getStatusLabel(invoice.status)}
              color={getStatusColor(invoice.status)}
              size="medium"
            />
          )}
          
          {hasPermission('billing.update') && (
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={4}>
        {/* Invoice Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon />
              Informazioni Fattura
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Numero Fattura</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {invoice.invoice_number}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Importo</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                  {formatAmount(invoice.amount)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Data Emissione</Typography>
                <Typography variant="body1">{formatDate(invoice.issue_date)}</Typography>
              </Grid>
              
             
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Modalità di Pagamento</Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {invoice.payment_method}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Descrizione</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {invoice.description}
                </Typography>
              </Grid>
              
              {invoice.payment_notes && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Note Pagamento</Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {invoice.payment_notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Patient Information */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon />
              Paziente
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {invoice.patient_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {invoice.patient_id}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">Creato da</Typography>
            <Typography variant="body1">{invoice.created_by_username}</Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Data Creazione</Typography>
            <Typography variant="body1">{formatDate(invoice.created_at)}</Typography>
            
            {invoice.updated_at && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Ultima Modifica</Typography>
                <Typography variant="body1">{formatDate(invoice.updated_at)}</Typography>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Modifica Fattura
        </MenuItem>
        <MenuItem onClick={handleDownloadPDF}>
          <DownloadIcon sx={{ mr: 1 }} />
          Scarica PDF
        </MenuItem>
        <MenuItem onClick={handleFindOrCreateCreditNote}>
          <NoteAddIcon sx={{ mr: 1 }} />
          Emetti nota di credito
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default InvoiceDetailPage;