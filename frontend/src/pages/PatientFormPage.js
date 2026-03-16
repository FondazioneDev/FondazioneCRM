import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Alert,
  CircularProgress,
  Container,
  Stack,
  IconButton,
  Avatar,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  RadioGroup,
  Radio,
  FormLabel,
  Chip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { patientService, userService } from "../services/api";
import { maritalStatusOptions } from "../utils/maritalStatusUtils";
import { useAuth } from "../contexts/AuthContext";
// Opzioni per i selettori
const sostanzaAbusoOptions = [
  { value: "", label: "Nessuna" },
  { value: "alcol", label: "Alcol" },
  { value: "caffeina", label: "Caffeina" },
  { value: "cannabis", label: "Cannabis" },
  { value: "allucinogeni", label: "Allucinogeni" },
  { value: "inalanti", label: "Inalanti" },
  { value: "oppiacei", label: "Oppiacei" },
  { value: "sedativi", label: "Sedativi, ipnotici o ansiolitici" },
  {
    value: "stimolanti",
    label: "Stimolanti (cocaina, anfetamine, metanfetamina)",
  },
  { value: "tabacco", label: "Tabacco" },
  { value: "altro", label: "Altre sostanze o non specificate" },
  {
    value: "disturbo_gioco_azzardo",
    label: "Disturbo da gioco d’azzardo (Gambling Disorder)",
  },
];
const PatientFormPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [patient, setPatient] = useState(null);

  const [formData, setFormData] = useState({
    codice_fiscale: "",
    numero_tessera_sanitaria: "",
    nome: "",
    cognome: "",
    data_nascita: null,
    sesso: "",
    telefono: "",
    email: "",
    indirizzo: "",
    citta: "",
    cap: "",
    provincia: "",
    consenso_trattamento_dati: false,
    note: "",
    medico_curante: null, // Clinician assignment
    diagnosi_psichiatrica: "",
    // New fields as per TODO requirements
    sostanza_abuso: "", // Substance of abuse
    abusi_secondari: [], // Secondary substance abuse (multi-select)
    stato_civile: "", // Civil status
    professione: "", // Profession information
    consenso_invio_sts: null, // Consent for sending data to STS
  });

  const [errors, setErrors] = useState({});
  const [clinicians, setClinicians] = useState([]);

  const { hasPermission, user } = useAuth();
  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await patientService.getPatient(id);
      const patientData = response.patient;

      setPatient(patientData);
      // Destructure to exclude come_vi_raggiunge field
      const { come_vi_raggiunge, ...cleanPatientData } = patientData;

      setFormData({
        ...cleanPatientData,
        // Convert null values to empty strings for text fields
        nome: patientData.nome || "",
        cognome: patientData.cognome || "",
        codice_fiscale: patientData.codice_fiscale || "",
        numero_tessera_sanitaria: patientData.numero_tessera_sanitaria || "",
        telefono: patientData.telefono || "",
        email: patientData.email || "",
        indirizzo: patientData.indirizzo || "",
        citta: patientData.citta || "",
        provincia: patientData.provincia || "",
        cap: patientData.cap || "",
        professione: patientData.professione || "",
        stato_civile: patientData.stato_civile || "",
        note: patientData.note || "",
        diagnosi_psichiatrica: patientData.diagnosi_psichiatrica || "",
        medico_curante: patientData.medico_curante || "",
        data_nascita: patientData.data_nascita
          ? new Date(patientData.data_nascita)
          : null,
        abusi_secondari: patientData.abusi_secondari || [],
      });
    } catch (error) {
      console.error("Errore nel caricamento del paziente:", error);
      setError("Errore nel caricamento del paziente");
    } finally {
      setLoading(false);
    }
  }, [id]);
  const fetchClinicians = useCallback(async () => {
    try {
      const response = await userService.getClinicians();
      // Filter and deduplicate users
      const uniqueUsers = response.clinicians
        .filter((user) => user.first_name && user.last_name) // Only users with complete name info
        .reduce((unique, user) => {
          // Remove duplicates based on ID
          if (!unique.find((u) => u.id === user.id)) {
            unique.push(user);
          }
          return unique;
        }, [])
        .sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`
          )
        ); // Sort by name

      setClinicians(uniqueUsers);
    } catch (error) {
      console.error("Errore nel caricamento dei clinici:", error);
    }
  }, []);
  useEffect(() => {
    if (isEdit) {
      fetchPatient();
    }
    fetchClinicians();
  }, [fetchClinicians, fetchPatient, isEdit]);

  const handleChange = useCallback(
    (event) => {
      const { name, value, type, checked } = event.target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: null }));
      }
    },
    [errors]
  );

  const handleClinicianChange = useCallback(
    (_, newValue) => {
      setFormData((prev) => ({
        ...prev,
        medico_curante: newValue ? newValue.id : "",
      }));

      // Clear error when user makes selection
      if (errors.medico_curante) {
        setErrors((prev) => ({ ...prev, medico_curante: null }));
      }
    },
    [errors]
  );

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.nome?.trim()) newErrors.nome = "Nome è obbligatorio";
    if (!formData.cognome?.trim()) newErrors.cognome = "Cognome è obbligatorio";

    // Make codice_fiscale optional but validate format if provided
    if (formData.codice_fiscale?.trim()) {
      if (formData.codice_fiscale.trim().length !== 16) {
        newErrors.codice_fiscale = "Il codice fiscale deve essere di 16 caratteri";
      }
    }
 
    // Validazione data di nascita
    if (!formData.data_nascita) {
      newErrors.data_nascita = "Data di nascita è obbligatoria";
    } else {
      const today = new Date();
      const birthDate = formData.data_nascita;
      const age = Math.floor(
        (today - birthDate) / (1000 * 60 * 60 * 24 * 365.25)
      );

      if (birthDate > today) {
        newErrors.data_nascita = "La data di nascita non può essere nel futuro";
      } else if (age > 200) {
        newErrors.data_nascita = "Il paziente non può avere più di 200 anni";
      }
    }

    if (!formData.sesso) newErrors.sesso = "Sesso è obbligatorio";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!validateForm()) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Prepare form data with Date object converted to string for API
        const submissionData = {
          ...formData,
          // Convert empty codice_fiscale to null
          codice_fiscale: formData.codice_fiscale?.trim() || null,
          // Convert Date object to YYYY-MM-DD format for API (using local timezone to avoid date shift)
          data_nascita: formData.data_nascita
            ? format(formData.data_nascita, "yyyy-MM-dd")
            : null,
        };

        // Debug: check formData content
        console.log("📋 FormData being sent:", {
          ...submissionData,
          medico_curante: submissionData.medico_curante,
          medico_curante_type: typeof submissionData.medico_curante,
        });

        if (isEdit) {
          await patientService.updatePatient(id, submissionData);
        } else {
          await patientService.createPatient(submissionData);
        }

        setSuccess(true);
        setTimeout(() => {
          if (isEdit) {
            // For edits, redirect to patient detail page
            navigate(`/patients/${id}`);
          } else {
            // For new patients, redirect to patients list
            navigate("/patients");
          }
        }, 1500);
      } catch (error) {
        console.error("Errore nel salvataggio del paziente:", error);

        // Handle detailed validation errors from backend
        if (error.response?.data?.details) {
          const validationErrors = {};
          error.response.data.details.forEach((errorMsg) => {
            // Map backend error messages to form fields
            if (errorMsg.includes("Nome")) {
              validationErrors.nome = errorMsg;
            } else if (errorMsg.includes("Cognome")) {
              validationErrors.cognome = errorMsg;
            } else if (errorMsg.includes("Codice Fiscale")) {
              validationErrors.codice_fiscale = errorMsg;
            } else if (errorMsg.includes("Numero Tessera Sanitaria")) {
              validationErrors.numero_tessera_sanitaria = errorMsg;
            } else if (
              errorMsg.includes("Data di nascita") ||
              errorMsg.includes("date")
            ) {
              validationErrors.data_nascita = errorMsg;
            } else if (errorMsg.includes("Sesso")) {
              validationErrors.sesso = errorMsg;
            } else if (errorMsg.includes("email")) {
              validationErrors.email = errorMsg;
            } else if (
              errorMsg.includes("phone") ||
              errorMsg.includes("telefono")
            ) {
              validationErrors.telefono = errorMsg;
            } else if (errorMsg.includes("CAP")) {
              validationErrors.cap = errorMsg;
            } else if (
              errorMsg.includes("clinician") ||
              errorMsg.includes("medico")
            ) {
              validationErrors.medico_curante = errorMsg;
            } else if (errorMsg.includes("Consenso")) {
              validationErrors.consenso_trattamento_dati = errorMsg;
            }
          });

          // If we mapped any errors to specific fields, show them on the form
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setError(
              `Errori di validazione: ${error.response.data.details.join(", ")}`
            );
          } else {
            // Show all validation errors as general error if we couldn't map them
            setError(
              `Errori di validazione: ${error.response.data.details.join(", ")}`
            );
          }
        } else {
          // Standard error handling
          setError(
            error.response?.data?.error || "Errore nel salvataggio del paziente"
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [formData, id, isEdit, navigate, validateForm]
  );
  const [notAllowed, setNotAllowed] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !patient) return;

    // If user has full update permission, allow
    if (hasPermission("patients.update")) {
      setNotAllowed(false);
      setCheckingPermission(false);
      return;
    }

    // If user has update_own and is the owner, allow
    if (
      hasPermission("patients.update_own") &&
      patient.created_by_username === user.username
    ) {
      setNotAllowed(false);
      setCheckingPermission(false);
      return;
    }

    // Otherwise, not allowed
    setNotAllowed(true);
    setCheckingPermission(false);
  }, [hasPermission, isEdit, patient, user.username]);

  if (notAllowed) {
    return <Navigate to={"/patients"} replace />;
  }

  if ((loading && isEdit) || checkingPermission) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
        >
          <Avatar
            sx={{
              bgcolor: "success.main",
              width: 80,
              height: 80,
              mb: 2,
            }}
          >
            <CheckIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" gutterBottom>
            {isEdit
              ? "Paziente aggiornato con successo!"
              : "Paziente creato con successo!"}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Reindirizzamento in corso...
          </Typography>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <IconButton onClick={() => navigate("/patients")} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {isEdit ? "Modifica Paziente" : "Nuovo Paziente"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isEdit
              ? "Aggiorna le informazioni del paziente"
              : "Inserisci i dati del nuovo paziente"}
          </Typography>
        </Box>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Dati Anagrafici */}
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                color: "primary.main",
                fontWeight: 600,
                mb: 3,
              }}
            >
              Dati Anagrafici
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="nome"
                  label="Nome"
                  fullWidth
                  value={formData.nome}
                  onChange={handleChange}
                  error={!!errors.nome}
                  helperText={errors.nome}
                  variant="outlined"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="cognome"
                  label="Cognome"
                  fullWidth
                  value={formData.cognome}
                  onChange={handleChange}
                  error={!!errors.cognome}
                  helperText={errors.cognome}
                  variant="outlined"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="codice_fiscale"
                  label="Codice Fiscale"
                  fullWidth
                  value={formData.codice_fiscale}
                  onChange={handleChange}
                  error={!!errors.codice_fiscale}
                  helperText={errors.codice_fiscale}
                  variant="outlined"
                  inputProps={{ 
                    style: { textTransform: "uppercase" },
                    maxLength: 16 
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="numero_tessera_sanitaria"
                  label="Numero Tessera Sanitaria"
                  fullWidth
                  value={formData.numero_tessera_sanitaria}
                  onChange={handleChange}
                  error={!!errors.numero_tessera_sanitaria}
                  helperText={errors.numero_tessera_sanitaria}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Data di Nascita *"
                  value={formData.data_nascita}
                  onChange={(newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      data_nascita: newValue,
                    }));
                    // Clear error when user changes the date
                    if (errors.data_nascita) {
                      setErrors((prev) => ({ ...prev, data_nascita: null }));
                    }
                  }}
                  maxDate={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear())
                    )
                  } // Massimo 16 anni fa
                  minDate={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 200)
                    )
                  } // Massimo 80 anni fa
                  // shouldDisableDate={(date) => {
                  //   const today = new Date();
                  //   const age = Math.floor(
                  //     (today - date) / (1000 * 60 * 60 * 24 * 365.25)
                  //   );
                  //   return age < 16 || age > 80;
                  // }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      error: !!errors.data_nascita,
                      helperText:
                        errors.data_nascita || "",
                      required: true,
                    },
                  }}
                  format="dd/MM/yyyy"
                  views={["year", "month", "day"]}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl error={!!errors.sesso} required>
                  <FormLabel component="legend">Sesso</FormLabel>
                  <RadioGroup
                    name="sesso"
                    value={formData.sesso}
                    onChange={handleChange}
                    row
                  >
                    <FormControlLabel
                      value="M"
                      control={<Radio />}
                      label="Maschio"
                    />
                    <FormControlLabel
                      value="F"
                      control={<Radio />}
                      label="Femmina"
                    />
                    <FormControlLabel
                      value="A"
                      control={<Radio />}
                      label="Altro"
                    />
                  </RadioGroup>
                  {errors.sesso && (
                    <FormHelperText>{errors.sesso}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Informazioni di Contatto */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    mb: 3,
                  }}
                >
                  Informazioni di Contatto
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="telefono"
                  label="Telefono"
                  fullWidth
                  value={formData.telefono}
                  onChange={handleChange}
                  type="tel"
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="email"
                  label="Email"
                  fullWidth
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="indirizzo"
                  label="Indirizzo"
                  fullWidth
                  value={formData.indirizzo}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  name="citta"
                  label="Città"
                  fullWidth
                  value={formData.citta}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  name="cap"
                  label="CAP"
                  fullWidth
                  value={formData.cap}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  name="provincia"
                  label="Provincia"
                  fullWidth
                  value={formData.provincia}
                  inputProps={{
                    style: { textTransform: "uppercase" },
                    maxLength: 2,
                  }}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>

              {/* Consensi */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    mb: 3,
                  }}
                >
                  Consensi e Privacy
                </Typography>
              </Grid>

              <Grid item xs={12} container spacing={2}>
                <Grid item xs={12}>
                  {/* Consenso Trattamento Dati - Changed to Radio Group */}
                  <FormControl
                    component="fieldset"
                    error={!!errors.consenso_trattamento_dati}
                    required
                  >
                    <FormLabel
                      component="legend"
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      Consenso al trattamento dei dati personali
                    </FormLabel>

                    <RadioGroup
                      value={
                        formData.consenso_trattamento_dati?.toString() ||
                        "false"
                      }
                      onChange={(e) => {
                        const value = e.target.value === "true";
                        setFormData((prev) => ({
                          ...prev,
                          consenso_trattamento_dati: value,
                        }));
                        // Clear error when user makes selection
                        if (errors.consenso_trattamento_dati) {
                          setErrors((prev) => ({
                            ...prev,
                            consenso_trattamento_dati: null,
                          }));
                        }
                      }}
                      row
                    >
                      <FormControlLabel
                        value="true"
                        control={<Radio />}
                        label="Sì"
                      />
                      <FormControlLabel
                        value="false"
                        control={<Radio />}
                        label="No"
                      />
                    </RadioGroup>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Il paziente ha autorizzato al trattamento dei rispettivi
                      dati personali
                    </Typography>
                    {errors.consenso_trattamento_dati && (
                      <FormHelperText error sx={{ mt: 1 }}>
                        {errors.consenso_trattamento_dati}
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  {/* Consenso Invio Dati STS */}
                  <FormControl
                    component="fieldset"
                    error={!!errors.consenso_invio_sts}
                    required
                    sx={{ mb: 2 }}
                  >
                    <FormLabel
                      component="legend"
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      Consenso Invio Dati STS
                    </FormLabel>
                    <RadioGroup
                      value={
                        formData.consenso_invio_sts === null
                          ? "null"
                          : formData.consenso_invio_sts?.toString()
                      }
                      onChange={(e) => {
                        const value =
                          e.target.value === "null"
                            ? null
                            : e.target.value === "true";
                        setFormData((prev) => ({
                          ...prev,
                          consenso_invio_sts: value,
                        }));
                      }}
                      row
                    >
                      <FormControlLabel
                        value="true"
                        control={<Radio />}
                        label="Acconsento"
                      />
                      <FormControlLabel
                        value="false"
                        control={<Radio />}
                        label="Non acconsento"
                      />
                      <FormControlLabel
                        value="null"
                        control={<Radio />}
                        label="Non specificato"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>

              {/* New clinical information fields */}
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, mb: 2, color: "primary.main" }}
                >
                  Informazioni Cliniche
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  fullWidth
                  options={sostanzaAbusoOptions}
                  getOptionLabel={(option) => option.label}
                  value={
                    sostanzaAbusoOptions.find(
                      (option) => option.value === formData.sostanza_abuso
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    handleChange({
                      target: {
                        name: "sostanza_abuso",
                        value: newValue ? newValue.value : "",
                      },
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="D.U.S"
                      placeholder="Seleziona o cerca sostanza..."
                      error={!!errors.sostanza_abuso}
                      helperText={errors.sostanza_abuso}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                      <Box component="li" key={option.value} {...optionProps}>
                        <Typography variant="body2">{option.label}</Typography>
                      </Box>
                    );
                  }}
                  noOptionsText="Nessuna sostanza trovata"
                  isOptionEqualToValue={(option, value) =>
                    option?.value === value?.value
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  fullWidth
                  options={sostanzaAbusoOptions.filter(
                    (option) => option.value !== ""
                  )}
                  getOptionLabel={(option) => option.label}
                  value={formData.abusi_secondari
                    .map((value) =>
                      sostanzaAbusoOptions.find(
                        (option) => option.value === value
                      )
                    )
                    .filter(Boolean)}
                  onChange={(event, newValue) => {
                    const selectedValues = newValue.map(
                      (option) => option.value
                    );
                    setFormData((prev) => ({
                      ...prev,
                      abusi_secondari: selectedValues,
                    }));
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...chipProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={option.value}
                          label={option.label}
                          {...chipProps}
                          size="small"
                          sx={{
                            backgroundColor: "#f0f9ff",
                            border: "1px solid #0ea5e9",
                            color: "#0369a1",
                            "& .MuiChip-deleteIcon": {
                              color: "#0369a1",
                              "&:hover": {
                                color: "#dc2626",
                              },
                            },
                          }}
                        />
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Abusi Secondari"
                      placeholder="Seleziona sostanze secondarie..."
                      error={!!errors.abusi_secondari}
                      helperText={
                        errors.abusi_secondari ||
                        "Seleziona le sostanze di abuso secondarie (opzionale)"
                      }
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                      <Box component="li" key={option.value} {...optionProps}>
                        <Typography variant="body2">{option.label}</Typography>
                      </Box>
                    );
                  }}
                  noOptionsText="Nessuna sostanza trovata"
                  isOptionEqualToValue={(option, value) =>
                    option?.value === value?.value
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="diagnosi_psichiatrica"
                  label="Diagnosi Psichiatrica"
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.diagnosi_psichiatrica}
                  onChange={handleChange}
                  variant="outlined"
                  placeholder="Eventuali diagnosi psichiatriche rilevanti..."
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Stato Civile</InputLabel>
                  <Select
                    name="stato_civile"
                    value={formData.stato_civile}
                    onChange={handleChange}
                    label="Stato Civile"
                  >
                    {maritalStatusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="professione"
                  label="Professione"
                  fullWidth
                  value={formData.professione}
                  onChange={handleChange}
                  placeholder="Professione, status lavorativo..."
                />
              </Grid>

              {/* Medico Curante */}
              <Grid item xs={12}>
                <Autocomplete
                  options={clinicians}
                  getOptionLabel={(option) =>
                    `${option.first_name} ${option.last_name} (${
                      option.role_name || "N/A"
                    })`
                  }
                  value={
                    clinicians.find(
                      (c) => c.id === parseInt(formData.medico_curante)
                    ) || null
                  }
                  onChange={handleClinicianChange}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.first_name} {option.last_name} (
                      {option.role_name || "N/A"})
                    </li>
                  )}
                  componentsProps={{
                    popper: {
                      placement: "bottom-start",
                      modifiers: [
                        {
                          name: "flip",
                          enabled: false, // Disable auto-flip to top
                        },
                        {
                          name: "preventOverflow",
                          enabled: true,
                          options: {
                            altAxis: true,
                            altBoundary: true,
                            tether: false,
                            rootBoundary: "document",
                          },
                        },
                      ],
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Clinico di Riferimento"
                      placeholder="Cerca e seleziona un clinico..."
                      error={!!errors.medico_curante}
                      helperText={errors.medico_curante}
                    />
                  )}
                  noOptionsText="Nessun clinico trovato"
                  clearText="Rimuovi selezione"
                  openText="Apri opzioni"
                  closeText="Chiudi opzioni"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="note"
                  label="Note aggiuntive"
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.note}
                  onChange={handleChange}
                  variant="outlined"
                  placeholder="Eventuali note o informazioni aggiuntive..."
                />
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 4,
                pt: 3,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => navigate("/patients")}
                startIcon={<CancelIcon />}
              >
                Annulla
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <SaveIcon />
                }
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  "&:hover": {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                }}
              >
                {loading
                  ? "Salvataggio..."
                  : isEdit
                  ? "Aggiorna Paziente"
                  : "Crea Paziente"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PatientFormPage;
