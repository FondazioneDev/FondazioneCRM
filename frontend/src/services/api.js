import axios from "axios";
import { createAuthInterceptor } from "../utils/authInterceptor";

// Configurazione base per le API
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";
const PATIENT_SERVICE_URL =
  process.env.REACT_APP_PATIENT_SERVICE_URL || "http://localhost:3000";
const CLINICAL_SERVICE_URL =
  process.env.REACT_APP_CLINICAL_SERVICE_URL || "http://localhost:3000";
const GROUP_SERVICE_URL =
  process.env.REACT_APP_GROUP_SERVICE_URL || "http://localhost:3000";

// Istanza axios per Auth Service (API Gateway)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Aumentato a 30 secondi
  headers: {
    "Content-Type": "application/json",
  },
});

// Istanza axios per Patient Service
const patientApi = axios.create({
  baseURL: PATIENT_SERVICE_URL,
  timeout: 30000, // Aumentato a 30 secondi
  headers: {
    "Content-Type": "application/json",
  },
});

// Istanza axios per Clinical Service
const clinicalApi = axios.create({
  baseURL: CLINICAL_SERVICE_URL,
  timeout: 30000, // Aumentato a 30 secondi
  headers: {
    "Content-Type": "application/json",
  },
});

// Istanza axios per Group Service
const groupApi = axios.create({
  baseURL: GROUP_SERVICE_URL,
  timeout: 30000, // Aumentato a 30 secondi
  headers: {
    "Content-Type": "application/json",
  },
});

// Apply centralized authentication interceptor to all axios instances
createAuthInterceptor(api, API_BASE_URL);
createAuthInterceptor(patientApi, API_BASE_URL);
createAuthInterceptor(clinicalApi, API_BASE_URL);
createAuthInterceptor(groupApi, API_BASE_URL);

// Add specific debugging interceptor for group API
groupApi.interceptors.request.use(
  (config) => {
    console.log("=== GROUP API REQUEST INTERCEPTOR ===");
    console.log("Method:", config.method);
    console.log("URL:", config.url);
    console.log("Headers:", config.headers);
    console.log("Data (raw):", config.data);
    console.log("Data type:", typeof config.data);
    console.log("Data stringified:", JSON.stringify(config.data));
    console.log("====================================");
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptors are now handled by the centralized createAuthInterceptor utility

// All token refresh logic is now centralized in createAuthInterceptor utility
// This eliminates ~75 lines of duplicated code

// Servizi per l'autenticazione
export const authService = {
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  getRoles: async () => {
    const response = await api.get("/auth/roles");
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put("/auth/profile", profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.put("/auth/change-password", passwordData);
    return response.data;
  },
};

// Servizi per i pazienti
export const patientService = {
  async getPatients(params = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value);
      }
    });

    const response = await api.get(`/patients?${queryParams}`);
    return response.data;
  },

  getPatient: async (id) => {
    const response = await patientApi.get(`/patients/${id}`);
    return response.data;
  },

  getPatientByCF: async (codiceFiscale) => {
    const response = await patientApi.get(`/patients/cf/${codiceFiscale}`);
    return response.data;
  },

  getPatientByTS: async (numeroTesseraSanitaria) => {
    const response = await patientApi.get(
      `/patients/ts/${numeroTesseraSanitaria}`
    );
    return response.data;
  },

  createPatient: async (patientData) => {
    const response = await patientApi.post("/patients", patientData);
    return response.data;
  },

  updatePatient: async (id, patientData) => {
    const response = await patientApi.put(`/patients/${id}`, patientData);
    return response.data;
  },

  deletePatient: async (id) => {
    const response = await patientApi.delete(`/patients/${id}`);
    return response.data;
  },

  getPatientDocuments: async (patientId) => {
    const response = await patientApi.get(`/patients/${patientId}/documents`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await patientApi.get("/patients/statistics");
    return response.data;
  },
};

// Servizi per i documenti
export const documentService = {
  uploadDocument: async (patientId, formData) => {
    const response = await patientApi.post(
      `/patients/${patientId}/documents`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  getDocument: async (id) => {
    const response = await patientApi.get(`/documents/${id}`);
    return response.data;
  },

  downloadDocument: async (id) => {
    const response = await patientApi.get(`/documents/${id}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  updateDocument: async (id, documentData) => {
    const response = await patientApi.put(`/documents/${id}`, documentData);
    return response.data;
  },

  deleteDocument: async (id) => {
    const response = await patientApi.delete(`/documents/${id}`);
    return response.data;
  },

  getDocumentsByType: async (type, params = {}) => {
    const response = await patientApi.get(`/documents/types/${type}`, {
      params,
    });
    return response.data;
  },
};

// Servizi per gli utenti (admin)
export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get("/users", { params });
    return response.data;
  },

  getClinicians: async () => {
    const response = await api.get("/users/clinicians");
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post("/users", userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  getRoles: async () => {
    const response = await api.get("/roles");
    return response.data;
  },

  updateUserPermissions: async (userId, permissions) => {
    const response = await api.put(`/users/${userId}/permissions`, {
      permissions,
    });
    return response.data;
  },

  transferUserOwnership: async (userId, newOwnerId) => {
    const response = await api.post(`/users/${userId}/transfer-ownership`, {
      newOwnerId,
    });
    return response.data;
  },

  getUserOwnershipSummary: async (userId) => {
    const response = await api.get(`/users/${userId}/ownership-summary`);
    return response.data;
  },
};

// Clinical Service API
export const clinicalService = {
  // Clinical Records
  getRecords: async (filters = {}) => {
    const response = await clinicalApi.get("/clinical/records", {
      params: filters,
    });
    return response.data;
  },

  getRecord: async (id) => {
    const response = await clinicalApi.get(`/clinical/records/${id}`);
    return response.data;
  },

  getPatientRecords: async (patientId, filters = {}) => {
    const response = await clinicalApi.get(
      `/clinical/records/patient/${patientId}`,
      { params: filters }
    );
    return response.data;
  },

  createRecord: async (recordData) => {
    const response = await clinicalApi.post("/clinical/records", recordData);
    return response.data;
  },

  updateRecord: async (id, recordData) => {
    const response = await clinicalApi.put(
      `/clinical/records/${id}`,
      recordData
    );
    return response.data;
  },

  deleteRecord: async (id) => {
    const response = await clinicalApi.delete(`/clinical/records/${id}`);
    return response.data;
  },

  // Clinical Documents
  getClinicalRecordDocuments: async (recordId) => {
    const response = await clinicalApi.get(
      `/clinical/clinical-records/${recordId}/documents`
    );
    return response.data;
  },

  uploadClinicalDocument: async (recordId, formData) => {
    const response = await clinicalApi.post(
      `/clinical/clinical-records/${recordId}/documents`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  deleteClinicalDocument: async (documentId) => {
    const response = await clinicalApi.delete(
      `/clinical/documents/${documentId}`
    );
    return response.data;
  },

  downloadClinicalDocument: async (documentId) => {
    const response = await clinicalApi.get(
      `/clinical/documents/${documentId}/download`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  getPatientRecordsCount: async (patientId) => {
    const response = await clinicalApi.get(
      `/clinical/records/patient/${patientId}/count`
    );
    return response.data;
  },

  getStatistics: async () => {
    const response = await clinicalApi.get("/clinical/statistics");
    return response.data;
  },
};

// Istanza axios per Billing Service
const billingApi = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Apply centralized authentication interceptor to billing service
createAuthInterceptor(billingApi, API_BASE_URL);

// Istanza axios per Audit Service
const auditApi = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Apply centralized authentication interceptor to audit service
createAuthInterceptor(auditApi, API_BASE_URL);

// Group Service API
export const groupService = {
  // Groups
  getGroups: async (filters = {}) => {
    const response = await groupApi.get("/groups", { params: filters });
    return response.data;
  },

  getGroup: async (id) => {
    const response = await groupApi.get(`/groups/${id}`);
    return response.data;
  },

  createGroup: async (groupData) => {
    console.log("=== API SERVICE DEBUG - CREATE GROUP ===");
    console.log("Group data being sent:", groupData);
    console.log("Conductors array:", groupData.conductors);
    console.log("Members array:", groupData.members);
    console.log("=======================================");
    const response = await groupApi.post("/groups", groupData);
    return response.data;
  },

  updateGroup: async (id, groupData) => {
    console.log("=== API SERVICE DEBUG - UPDATE GROUP ===");
    console.log("Group ID:", id);
    console.log("Group data being sent:", groupData);
    console.log("Conductors array:", groupData.conductors);
    console.log("Members array:", groupData.members);
    console.log("=======================================");
    const response = await groupApi.put(`/groups/${id}`, groupData);
    return response.data;
  },

  deleteGroup: async (id) => {
    const response = await groupApi.delete(`/groups/${id}`);
    return response.data;
  },

  getGroupStatistics: async () => {
    const response = await groupApi.get("/groups/statistics");
    return response.data;
  },

  // Group Members
  getGroupMembers: async (groupId, activeOnly = true) => {
    const params = activeOnly ? { active_only: "true" } : {};
    const response = await groupApi.get(`/groups/${groupId}/members`, {
      params,
    });
    return response.data;
  },

  addGroupMember: async (groupId, memberData) => {
    const response = await groupApi.post(
      `/groups/${groupId}/members`,
      memberData
    );
    return response.data;
  },

  updateGroupMember: async (groupId, memberId, memberData) => {
    const response = await groupApi.put(
      `/groups/${groupId}/members/${memberId}`,
      memberData
    );
    return response.data;
  },

  removeGroupMember: async (groupId, memberId) => {
    const response = await groupApi.delete(
      `/groups/${groupId}/members/${memberId}`
    );
    return response.data;
  },

  getPatientGroups: async (patientId) => {
    const response = await groupApi.get(`/patients/${patientId}/groups`);
    return response.data;
  },
  // Group Notes
  getNotes: async (filters = {}) => {
    const response = await groupApi.get("/groups/notes", { params: filters });
    return response.data;
  },

  getNote: async (id) => {
    const response = await groupApi.get(`/groups/notes/${id}`);
    return response.data;
  },

  getGroupNotes: async (groupId, filters = {}) => {
    const response = await groupApi.get(`/groups/notes/group/${groupId}`, {
      params: filters,
    });
    return response.data;
  },

  createNote: async (noteData) => {
    const response = await groupApi.post("/groups/notes", noteData);
    return response.data;
  },

  updateNote: async (id, noteData) => {
    const response = await groupApi.put(`/groups/notes/${id}`, noteData);
    return response.data;
  },

  deleteNote: async (id) => {
    const response = await groupApi.delete(`/groups/notes/${id}`);
    return response.data;
  },
  getNotesStatistics: async () => {
    const response = await groupApi.get("/groups/statistics");
    return response.data;
  },
  countGroupNotes: async (groupId) => {
    const response = await groupApi.get(`/groups/notes/group/${groupId}/count`);
    return response.data;
  },
};

// Billing Service API
export const billingService = {
  // Invoices
  getInvoices: async (filters = {}) => {
    const response = await billingApi.get("/billing/invoices", {
      params: filters,
    });
    return response.data;
  },

  getInvoice: async (id) => {
    const response = await billingApi.get(`/billing/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (invoiceData) => {
    const response = await billingApi.post("/billing/invoices", invoiceData);
    return response.data;
  },

  createCreditNote: async (invoiceId) => {
    const response = await billingApi.post(`/billing/invoices/${invoiceId}/credit-notes`);
    return response.data;
  },

  updateInvoice: async (id, invoiceData) => {
    const response = await billingApi.put(
      `/billing/invoices/${id}`,
      invoiceData
    );
    return response.data;
  },

  updateInvoiceStatus: async (id, statusData) => {
    const response = await billingApi.put(
      `/billing/invoices/${id}/status`,
      statusData
    );
    return response.data;
  },

  deleteInvoice: async (id) => {
    const response = await billingApi.delete(`/billing/invoices/${id}`);
    return response.data;
  },

  getInvoicePDF: async (id) => {
    const response = await billingApi.get(`/billing/invoices/${id}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },

  getStatistics: async (filters = {}) => {
    const response = await billingApi.get("/billing/statistics", {
      params: filters,
    });
    return response.data;
  },

  updateOverdueInvoices: async () => {
    const response = await billingApi.put("/billing/invoices/overdue");
    return response.data;
  },

  searchPatients: async (query) => {
    const response = await billingApi.get("/billing/patients/search", {
      params: { q: query },
    });
    return response.data;
  },
};

// Audit Service API
export const auditService = {
  // Audit Logs
  getAuditLogs: async (filters = {}) => {
    const response = await auditApi.get("/audit/logs", { params: filters });
    return response.data;
  },

  getAuditLog: async (id) => {
    const response = await auditApi.get(`/audit/logs/${id}`);
    return response.data;
  },

  createAuditLog: async (logData) => {
    const response = await auditApi.post("/audit/logs", logData);
    return response.data;
  },

  logAction: async (actionData) => {
    const response = await auditApi.post("/audit/log-action", actionData);
    return response.data;
  },

  getAuditStatistics: async (filters = {}) => {
    const response = await auditApi.get("/audit/statistics", {
      params: filters,
    });
    return response.data;
  },

  getActiveUsers: async (limit = 10) => {
    const response = await auditApi.get("/audit/users/active", {
      params: { limit },
    });
    return response.data;
  },

  getEntityActivity: async (entityType, limit = 10) => {
    const response = await auditApi.get(
      `/audit/entities/${entityType}/activity`,
      { params: { limit } }
    );
    return response.data;
  },

  cleanupOldLogs: async () => {
    const response = await auditApi.post("/audit/cleanup");
    return response.data;
  },
};

// GDPR Service API
export const gdprService = {
  // Consents
  getPatientConsents: async (patientId) => {
    const response = await auditApi.get(`/gdpr/consents/${patientId}`);
    return response.data;
  },

  updateConsent: async (patientId, consentType, consentData) => {
    const response = await auditApi.put(
      `/gdpr/consents/${patientId}/${consentType}`,
      consentData
    );
    return response.data;
  },

  getConsentHistory: async (patientId, consentType = null) => {
    const params = consentType ? { consent_type: consentType } : {};
    const response = await auditApi.get(`/gdpr/consents/${patientId}/history`, {
      params,
    });
    return response.data;
  },

  checkConsent: async (patientId, consentType) => {
    const response = await auditApi.get(
      `/gdpr/consents/${patientId}/${consentType}/check`
    );
    return response.data;
  },

  // Retention
  getRetentionStatus: async (patientId) => {
    const response = await auditApi.get(`/gdpr/retention/${patientId}`);
    return response.data;
  },

  // Data Requests
  createDataRequest: async (requestData) => {
    const response = await auditApi.post("/gdpr/requests", requestData);
    return response.data;
  },

  getDataRequests: async (filters = {}) => {
    const response = await auditApi.get("/gdpr/requests", { params: filters });
    return response.data;
  },

  updateDataRequestStatus: async (requestId, status, notes = null) => {
    const response = await auditApi.put(`/gdpr/requests/${requestId}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  // Compliance
  getComplianceSummary: async () => {
    const response = await auditApi.get("/gdpr/compliance/summary");
    return response.data;
  },

  getConsentTypes: async () => {
    const response = await auditApi.get("/gdpr/consent-types");
    return response.data;
  },
};

// Enhanced user service with standard method names
userService.getAll = userService.getUsers;
userService.getById = userService.getUser;
userService.create = userService.createUser;
userService.update = userService.updateUser;
userService.delete = userService.deleteUser;

export default api;
