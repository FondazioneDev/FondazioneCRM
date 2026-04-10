import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Container,
  useTheme,
  alpha,
  Divider,
  Fade,
  Switch,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { patientService } from "../services/api";
import LoadingSkeleton from "../components/LoadingSkeleton";
import useDebounce from "../hooks/useDebounce";
import { TypographyWithTooltip } from "../components/TypographyWithTooltip";

const HEADER_ARRAY = [
  {
    key: "nome",
    label: "Paziente",
    sortable: true,
    minWidth: 200,
    width: 200,
  },
  {
    key: "data_nascita",
    label: "Età",
    sortable: true,
    minWidth: 50,
    width: 120,
  },
  {
    key: "telefono",
    label: "Contatti",
    sortable: true,
    minWidth: 50,

    width: 200,
  },
  {
    key: "codice_fiscale",
    label: "Codice Fiscale",
    sortable: true,
    minWidth: 50,

    width: 100,
  },
  {
    key: "stato",
    label: "Stato",
    sortable: false,
    minWidth: 140,
    width: 160,
  },
  {
    key: "consenso",
    label: "Consenso",
    sortable: false,
    minWidth: 50,
    width: 150,
  },
  {
    key: "created_at",
    label: "Data Inizio",
    sortable: true,
    minWidth: 50,
    width: 140,
  },
  {
    key: "actions",
    label: "",
    sortable: false,
    minWidth: 60,
    width: 60,
  },
];
// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("it-IT");
};
const calculateAge = (birthDate) => {
  if (!birthDate) return "";
  const today = new Date();
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1;
  }
  return age;
};
const PatientsPageNew = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // State
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch patients function
  const fetchPatients = useCallback(async () => {
    try {
      // Set appropriate loading state
      if (initialLoading) {
        // Keep initialLoading true for skeleton
      } else {
        setLoading(true);
      }

      setError(null);

      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (sortBy && sortOrder) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }

      if (debouncedSearchTerm?.trim()) {
        params.search = debouncedSearchTerm.trim();
      }

      const response = await patientService.getPatients(params);

      setPatients(response.patients || []);
      setTotalCount(response.pagination?.total || 0);

      // Mark initial loading as complete
      if (initialLoading) {
        setInitialLoading(false);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      setError("Errore nel caricamento dei pazienti");

      if (initialLoading) {
        setInitialLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    sortBy,
    sortOrder,
    debouncedSearchTerm,
    initialLoading,
  ]);

  // Effects
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm]);

  // Handlers
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleSort = useCallback(
    (column) => {
      if (sortBy === column) {
        if (sortOrder === "ASC") {
          setSortOrder("DESC");
        } else if (sortOrder === "DESC") {
          setSortBy("");
          setSortOrder("");
        }
      } else {
        setSortBy(column);
        setSortOrder("ASC");
      }
    },
    [sortBy, sortOrder]
  );

  const getSortIcon = useCallback(
    (column) => {
      if (sortBy === column) {
        return sortOrder === "ASC" ? (
          <ArrowUpwardIcon fontSize="small" sx={{ color: "primary.main" }} />
        ) : (
          <ArrowDownwardIcon fontSize="small" sx={{ color: "primary.main" }} />
        );
      }
      return (
        <SortIcon
          fontSize="small"
          sx={{ opacity: 0.3, "&:hover": { opacity: 0.6 } }}
        />
      );
    },
    [sortBy, sortOrder]
  );

  const confirmDelete = useCallback(async () => {
    if (!selectedPatient?.id) return;

    try {
      await patientService.deletePatient(selectedPatient.id);
      await fetchPatients();
      setDeleteDialogOpen(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error("Error deleting patient:", error);
      setError("Errore nella cancellazione del paziente");
    }
  }, [fetchPatients, selectedPatient?.id]);

  const handleStatusToggle = useCallback(async (patient, newStatus) => {
    try {
      // Optimistic update
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patient.id ? { ...p, is_active: newStatus } : p
        )
      );

      await patientService.updatePatient(patient.id, { is_active: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert on error
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patient.id ? { ...p, is_active: !newStatus } : p
        )
      );
      setError("Errore nell'aggiornamento dello stato del paziente");
    }
  }, []);

  const getStatusSwitch = useCallback(
    (patient) => {
      const isActive = Boolean(patient.is_active);

      return (
        <Box
          data-testid="switch-container"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Switch
            checked={isActive}
            onChange={(e) => handleStatusToggle(patient, e.target.checked)}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: "#2e7d32",
                "&:hover": {
                  backgroundColor: alpha("#2e7d32", 0.08),
                },
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: "#2e7d32",
              },
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.8rem",
              fontWeight: 500,
              color: isActive ? "#2e7d32" : "#666666",
              cursor: "default",
              userSelect: "none",
            }}
          >
            {isActive ? "In Cura" : "Non in cura"}
          </Typography>
        </Box>
      );
    },
    [handleStatusToggle]
  );

  const getConsentChip = useCallback(
    (patient) => {
      const hasConsent = patient.consenso_trattamento_dati === true;

      return (
        <Chip
          label={hasConsent ? "Accettato" : "Non Accettato"}
          size="small"
          sx={{
            fontSize: "0.75rem",
            height: 24,
            fontWeight: 500,
            borderRadius: 2,
            backgroundColor: hasConsent
              ? alpha(theme.palette.success.main, 0.1)
              : alpha(theme.palette.warning.main, 0.1),
            color: hasConsent
              ? theme.palette.success.main
              : theme.palette.warning.main,
            border: `1px solid ${
              hasConsent
                ? alpha(theme.palette.success.main, 0.2)
                : alpha(theme.palette.warning.main, 0.2)
            }`,
          }}
        />
      );
    },
    [theme]
  );

  // Show skeleton only on initial load
  if (initialLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Fade in timeout={500}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header with Search */}
        <Box sx={{ mb: 4 }}>
          <Stack
            direction="row"
            gap={3}
            useFlexGap
            sx={{
              flexWrap: { xs: "wrap", sm: "nowrap" },
            }}
            alignItems="center"
            justifyContent="space-between"
          >
            <TextField
              placeholder="Cerca pazienti per nome, medico di riferimento, CF, email o telefono..."
              value={searchTerm}
              onChange={handleSearchChange}
              size="medium"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 22, color: "text.disabled" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {/* Loading indicator when searching */}
                      {loading && searchTerm && (
                        <CircularProgress
                          size={16}
                          thickness={4}
                          sx={{
                            color: "primary.main",
                            mr: 0.5,
                          }}
                        />
                      )}
                      {/* Clear search button */}
                      {searchTerm && (
                        <IconButton
                          size="small"
                          onClick={handleClearSearch}
                          sx={{
                            color: "text.disabled",
                            padding: 0.5,
                            "&:hover": {
                              color: "text.primary",
                              backgroundColor: alpha(
                                theme.palette.grey[300],
                                0.1
                              ),
                            },
                          }}
                          title="Cancella ricerca"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: { lg: "500px" },
                minWidth: 220,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.grey[50], 0.8),
                  border: `1px solid ${alpha(theme.palette.grey[300], 0.5)}`,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.grey[100], 0.8),
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.3
                    )}`,
                  },
                  "&.Mui-focused": {
                    backgroundColor: "white",
                    border: `1px solid ${theme.palette.primary.main}`,
                    boxShadow: `0 0 0 3px ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                  },
                },
              }}
            />

            {hasPermission("patients.write") && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="medium"
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  whiteSpace: "nowrap",
                  minWidth: 172,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.primary.main,
                    0.3
                  )}`,
                  "&:hover": {
                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                    transform: "translateY(-1px)",
                    boxShadow: `0 4px 12px ${alpha(
                      theme.palette.primary.main,
                      0.4
                    )}`,
                  },
                }}
                onClick={() => navigate("/patients/new")}
              >
                Nuovo Paziente
              </Button>
            )}
          </Stack>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 2,
              boxShadow: theme.shadows[1],
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Table */}
        <Box
          sx={{
            border: 1,
            borderColor: alpha(theme.palette.grey[300], 0.6),
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: "background.paper",
            boxShadow: theme.shadows[1],
            transition: "all 0.3s ease-in-out",
            position: "relative",
            "&:hover": {
              boxShadow: theme.shadows[4],
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            },
          }}
        >
          {/* Loading overlay */}
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                backdropFilter: "blur(3px) saturate(150%)",
                borderRadius: "inherit",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <CircularProgress size={28} thickness={4} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  Caricamento in corso...
                </Typography>
              </Stack>
            </Box>
          )}

          <TableContainer sx={{ position: "relative", minHeight: 720 }}>
            {/* Empty State Overlay - moved inside TableContainer */}
            {patients.length === 0 && !loading && (
              <Box
                sx={{
                  position: "absolute",
                  top: 60, // Start below the header
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 500,
                  backgroundColor: alpha(theme.palette.background.paper, 0.95),
                  backdropFilter: "blur(1px)",
                }}
              >
                <Box
                  sx={{
                    textAlign: "center",
                    color: "text.secondary",
                  }}
                >
                  <PersonIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: 400 }}
                  >
                    {debouncedSearchTerm
                      ? "Nessun paziente trovato"
                      : "Nessun paziente registrato"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
                    {debouncedSearchTerm
                      ? "Prova a modificare i criteri di ricerca"
                      : "Inizia registrando il primo paziente nel sistema"}
                  </Typography>
                  {!debouncedSearchTerm && hasPermission("patients.write") && (
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      size="small"
                      onClick={() => navigate("/patients/new")}
                    >
                      Registra Primo Paziente
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.08
                    )} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
                    borderBottom: `2px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                  }}
                >
                  {HEADER_ARRAY.map((column) => (
                    <TableCell
                      key={column.key}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "text.primary",
                        letterSpacing: "0.5px",
                        py: 2,
                        minWidth: column.minWidth || 160,
                        cursor: column.sortable ? "pointer" : "default",
                        width: column.width || 160,
                        ...(column.key === "actions" && {
                          position: "sticky",
                          right: 0,
                          backgroundColor: "background.paper",
                          zIndex: 2,
                          textAlign: "center",
                        }),
                        "&:hover": column.sortable
                          ? {
                              backgroundColor: alpha(
                                theme.palette.primary.main,
                                0.05
                              ),
                            }
                          : {},
                      }}
                      onClick={
                        column.sortable
                          ? () => handleSort(column.key)
                          : undefined
                      }
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                        >
                          {column.label}
                        </Typography>
                        {column.sortable && getSortIcon(column.key)}
                      </Stack>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  "& .MuiTableRow-root:first-of-type": {
                    verticalAlign: "top",
                  },
                }}
              >
                {patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    sx={{
                      "&:hover": !loading
                        ? {
                            backgroundColor: alpha(
                              theme.palette.primary.main,
                              0.04
                            ),
                          }
                        : {},
                      cursor: loading ? "wait" : "pointer",
                      borderBottom: `1px solid ${alpha(
                        theme.palette.grey[300],
                        0.3
                      )}`,
                      transition: "all 0.2s ease-in-out",
                      opacity: loading ? 0.7 : 1,
                      verticalAlign: "top", // Keep rows at top
                    }}
                    onClick={(e) => {
                      if (loading) return;
                      const isFromSwitch = e.target.closest(
                        '[data-testid="switch-container"]'
                      );
                      const isFromButton = e.target.closest(
                        "button, .MuiIconButton-root"
                      );

                      if (isFromSwitch || isFromButton) return;
                      navigate(`/patients/${patient.id}`);
                    }}
                  >
                    <TableCell sx={{ py: 2, verticalAlign: "top" }}>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            lineHeight: 1.2,
                            color: "text.primary",
                            fontSize: "0.95rem",
                          }}
                        >
                          {patient.nome} {patient.cognome}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 500,
                          }}
                        >
                          ID: {patient.id}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Typography variant="body2">
                        {calculateAge(patient.data_nascita)} anni
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem" }}
                      >
                        {formatDate(patient.data_nascita)}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Box>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                          sx={{ mb: 0.5 }}
                        >
                          <PhoneIcon
                            sx={{ fontSize: 14, color: "text.disabled" }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ fontSize: "0.875rem" }}
                          >
                            {patient.telefono || "-"}
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                        >
                          <EmailIcon
                            sx={{ fontSize: 14, color: "text.disabled" }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "0.875rem",
                              color: "text.secondary",
                            }}
                          >
                            {patient.email || "-"}
                          </Typography>
                        </Stack>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ verticalAlign: "top" }}>
                      <TypographyWithTooltip
                        variant="body2"
                        sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}
                      >
                        {patient.codice_fiscale}
                      </TypographyWithTooltip>
                    </TableCell>

                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Box sx={{ pointerEvents: loading ? "none" : "auto" }}>
                        {getStatusSwitch(patient)}
                      </Box>
                    </TableCell>

                    <TableCell sx={{ verticalAlign: "top" }}>
                      {getConsentChip(patient)}
                    </TableCell>

                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.875rem" }}
                      >
                        {formatDate(patient.created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        verticalAlign: "top",
                        position: "sticky",
                        right: 0,
                        backgroundColor: "background.paper",
                        boxShadow: 2,
                        zIndex: 1,
                        "&:before": {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          borderLeft: 1,
                          borderColor: "rgba(203, 213, 225, 0.3)",
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="center"
                      >
                        {hasPermission("patients.read") && (
                          <IconButton
                            size="small"
                            disabled={loading}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}`);
                            }}
                            sx={{ color: "primary.main" }}
                            title="Visualizza Profilo"
                          >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        {hasPermission("patients.update") && (
                          <IconButton
                            size="small"
                            disabled={loading}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}/edit`);
                            }}
                            sx={{ color: "secondary.main" }}
                            title="Modifica Dati"
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        {hasPermission("patients.delete") && (
                          <IconButton
                            size="small"
                            disabled={loading}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatient(patient);
                              setDeleteDialogOpen(true);
                            }}
                            sx={{ color: "error.main" }}
                            title="Elimina Paziente"
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={
              loading ? undefined : (event, newPage) => setPage(newPage)
            }
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={
              loading
                ? undefined
                : (event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }
            }
            labelRowsPerPage="Pazienti per pagina"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} di ${count !== -1 ? count : `più di ${to}`}`
            }
            sx={{
              backgroundColor: alpha(theme.palette.grey[50], 0.3),
              opacity: loading ? 0.7 : 1,
              pointerEvents: loading ? "none" : "auto",
              "& .MuiTablePagination-toolbar": {
                minHeight: 48,
              },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                {
                  fontSize: "0.875rem",
                },
            }}
          />
        </Box>

        {/* Delete Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedPatient(null);
          }}
          maxWidth="xs"
          sx={{ "& .MuiPaper-root": { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ pb: 1 }}>Elimina paziente</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Sei sicuro di voler eliminare {selectedPatient?.nome}{" "}
              {selectedPatient?.cognome}? Questa azione rimuoverà
              definitivamente il paziente e tutti i suoi dati associati.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedPatient(null);
              }}
              size="small"
            >
              Annulla
            </Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              size="small"
            >
              Elimina
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Fade>
  );
};

export default PatientsPageNew;
