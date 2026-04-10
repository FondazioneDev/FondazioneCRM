const { query } = require("../database/connection");

class Patient {
  constructor(data) {
    this.id = data.id;
    this.codice_fiscale = data.codice_fiscale;
    this.numero_tessera_sanitaria = data.numero_tessera_sanitaria;
    this.nome = data.nome;
    this.cognome = data.cognome;
    this.data_nascita = data.data_nascita;
    this.sesso = data.sesso;
    this.indirizzo = data.indirizzo;
    this.citta = data.citta;
    this.cap = data.cap;
    this.provincia = data.provincia;
    this.telefono = data.telefono;
    this.email = data.email;
    this.consenso_trattamento_dati = data.consenso_trattamento_dati;
    this.note = data.note;
    this.medico_curante = data.medico_curante;
    this.sostanza_abuso = data.sostanza_abuso;
    this.abusi_secondari = data.abusi_secondari;
    this.professione = data.professione;
    this.stato_civile = data.stato_civile;
    this.diagnosi_psichiatrica = data.diagnosi_psichiatrica; 
    this.consenso_invio_sts = data.consenso_invio_sts;
    this.is_active = data.is_active;
    this.created_by = data.created_by;
    this.created_by_username = data.created_by_username;
    this.medico_curante_username = data.medico_curante_username;
    this.medico_curante_first_name = data.medico_curante_first_name;
    this.medico_curante_last_name = data.medico_curante_last_name;
    this.medico_curante_role = data.medico_curante_role;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new patient
  static async create(patientData) {
    const {
      codice_fiscale,
      numero_tessera_sanitaria,
      nome,
      cognome,
      data_nascita,
      sesso,
      indirizzo,
      citta,
      cap,
      provincia,
      telefono,
      email,
      consenso_trattamento_dati,
      note,
      medico_curante,
      sostanza_abuso,
      abusi_secondari,
      professione,
      stato_civile,
      diagnosi_psichiatrica, 
      consenso_invio_sts, 
      created_by,
    } = patientData;

    // Check codice_fiscale uniqueness only if provided
    if (codice_fiscale && codice_fiscale.trim()) {
      const existingPatient = await Patient.findByCodiceFiscale(codice_fiscale.trim());
      if (existingPatient) {
        throw new Error('Un paziente con questo codice fiscale esiste già');
      }
    }

    const queryText = `
      INSERT INTO patient.patients (
        codice_fiscale, numero_tessera_sanitaria, nome, cognome, data_nascita,
        sesso, indirizzo, citta, cap, provincia, telefono, email,
        consenso_trattamento_dati, note, medico_curante, 
        sostanza_abuso, abusi_secondari, professione, stato_civile, 
        diagnosi_psichiatrica, consenso_invio_sts, created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22
      )
      RETURNING *
    `;

    const values = [
      codice_fiscale?.trim() || null, // Convert empty string to null
      numero_tessera_sanitaria,
      nome,
      cognome,
      data_nascita,
      sesso,
      indirizzo,
      citta,
      cap,
      provincia,
      telefono,
      email,
      consenso_trattamento_dati,
      note,
      medico_curante === "" ? null : medico_curante,
      sostanza_abuso,
      abusi_secondari,
      professione,
      stato_civile,
      diagnosi_psichiatrica,
      consenso_invio_sts, 
      created_by,
    ];
    const result = await query(queryText, values);
    return new Patient(result.rows[0]);
  }

  // Find patient by ID
  static async findById(id) {
    const queryText = `
      SELECT p.*, u.username as created_by_username,
             mc.username as medico_curante_username,
             mc.first_name as medico_curante_first_name,
             mc.last_name as medico_curante_last_name,
             mr.name as medico_curante_role
      FROM patient.patients p
      LEFT JOIN auth.users u ON p.created_by = u.id
      LEFT JOIN auth.users mc ON p.medico_curante = mc.id
      LEFT JOIN auth.roles mr ON mc.role_id = mr.id
      WHERE p.id = $1
    `;

    const result = await query(queryText, [id]);
    return result.rows[0] ? new Patient(result.rows[0]) : null;
  }

  // Find patient by Codice Fiscale
  static async findByCodiceFiscale(codiceFiscale) {
    const queryText = `
      SELECT p.*, u.username as created_by_username
      FROM patient.patients p
      LEFT JOIN auth.users u ON p.created_by = u.id
      WHERE p.codice_fiscale = $1
    `;

    const result = await query(queryText, [codiceFiscale]);
    return result.rows[0] ? new Patient(result.rows[0]) : null;
  }

  // Find patient by Numero Tessera Sanitaria
  static async findByNumeroTesseraSanitaria(numeroTessera) {
    const queryText = `
      SELECT p.*, u.username as created_by_username
      FROM patient.patients p
      LEFT JOIN auth.users u ON p.created_by = u.id
      WHERE p.numero_tessera_sanitaria = $1
    `;

    const result = await query(queryText, [numeroTessera]);
    return result.rows[0] ? new Patient(result.rows[0]) : null;
  }

  // Search patients by name
  static async searchByName(searchTerm, limit = 10, offset = 0) {
    const queryText = `
      SELECT p.*, u.username as created_by_username
      FROM patient.patients p
      LEFT JOIN auth.users u ON p.created_by = u.id
      WHERE (p.nome ILIKE $1 OR p.cognome ILIKE $1 OR CONCAT(p.nome, ' ', p.cognome) ILIKE $1)
      ORDER BY p.cognome, p.nome
      LIMIT $2 OFFSET $3
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await query(queryText, [searchPattern, limit, offset]);
    return result.rows.map((row) => new Patient(row));
  }

  // Add the missing search method with sorting support
  static async search(searchTerm, limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'DESC') {
    // Validate sortBy column to prevent SQL injection
    const validSortColumns = [
      'nome', 'cognome', 'data_nascita', 'created_at', 'updated_at',
      'sesso', 'citta', 'telefono', 'email', 'codice_fiscale'
    ];

    const validSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const queryText = `
      SELECT p.*, u.username as created_by_username
      FROM patient.patients p
      LEFT JOIN auth.users u ON p.created_by = u.id
      LEFT JOIN auth.users mc ON p.medico_curante = mc.id
      WHERE (
        p.nome ILIKE $1 OR
        p.cognome ILIKE $1 OR
        (p.codice_fiscale IS NOT NULL AND p.codice_fiscale ILIKE $1) OR
        p.email ILIKE $1 OR
        p.telefono ILIKE $1 OR
        (mc.first_name IS NOT NULL AND mc.first_name ILIKE $1) OR
        (mc.last_name IS NOT NULL AND mc.last_name ILIKE $1) OR
        (mc.email IS NOT NULL AND mc.email ILIKE $1)
      )
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $2 OFFSET $3
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await query(queryText, [searchPattern, limit, offset]);
    return result.rows.map((row) => new Patient(row));
  }

  // Add the missing searchCount method
  static async searchCount(searchTerm) {
    const queryText = `
      SELECT COUNT(*) FROM patient.patients p
      LEFT JOIN auth.users mc ON p.medico_curante = mc.id
      WHERE (
        p.nome ILIKE $1 OR
        p.cognome ILIKE $1 OR
        (p.codice_fiscale IS NOT NULL AND p.codice_fiscale ILIKE $1) OR
        p.email ILIKE $1 OR
        p.telefono ILIKE $1 OR
        (mc.first_name IS NOT NULL AND mc.first_name ILIKE $1) OR
        (mc.last_name IS NOT NULL AND mc.last_name ILIKE $1) OR
        (mc.email IS NOT NULL AND mc.email ILIKE $1)
      )
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await query(queryText, [searchPattern]);
    return parseInt(result.rows[0].count);
  }

  // Get all patients with pagination
  static async findAll(filters = {}, limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'DESC') {
    let queryText = `
      SELECT * FROM patient.patients
    `;

    const conditions = [];
    const values = [];
    let paramCount = 0;

    // Apply existing filters
    if (filters.search) {
      paramCount++;
      conditions.push(`(nome ILIKE $${paramCount} OR cognome ILIKE $${paramCount} OR codice_fiscale ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
    }

    if (filters.sesso) {
      paramCount++;
      conditions.push(`sesso = $${paramCount}`);
      values.push(filters.sesso);
    }

    if (filters.stato_civile) {
      paramCount++;
      conditions.push(`stato_civile = $${paramCount}`);
      values.push(filters.stato_civile);
    }

    if (filters.citta) {
      paramCount++;
      conditions.push(`citta ILIKE $${paramCount}`);
      values.push(`%${filters.citta}%`);
    }

    if (filters.consenso_trattamento_dati) {
      paramCount++;
      conditions.push(`consenso_trattamento_dati = $${paramCount}`);
      values.push(filters.consenso_trattamento_dati);
    }

    // Add age range filter if provided
    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      if (filters.ageMin !== undefined) {
        paramCount++;
        conditions.push(`DATE_PART('year', AGE(data_nascita)) >= $${paramCount}`);
        values.push(filters.ageMin);
      }
      if (filters.ageMax !== undefined) {
        paramCount++;
        conditions.push(`DATE_PART('year', AGE(data_nascita)) <= $${paramCount}`);
        values.push(filters.ageMax);
      }
    }

    // Add date range filter if provided
    if (filters.createdDateFrom) {
      paramCount++;
      conditions.push(`created_at >= $${paramCount}`);
      values.push(filters.createdDateFrom);
    }

    if (filters.createdDateTo) {
      paramCount++;
      conditions.push(`created_at <= $${paramCount}`);
      values.push(filters.createdDateTo);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Validate sortBy column to prevent SQL injection
    const validSortColumns = [
      'nome', 'cognome', 'data_nascita', 'created_at', 'updated_at', 
      'sesso', 'citta', 'telefono', 'email', 'codice_fiscale'
    ];
    
    const validSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    queryText += ` ORDER BY ${validSortBy} ${validSortOrder}`;
    queryText += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    try {
      const result = await query(queryText, values);
      return result.rows.map(row => new Patient(row));
    } catch (error) {
      throw error;
    }
  }

  // Count total patients
  static async count(filters = {}) {
    let queryText = `SELECT COUNT(*) FROM patient.patients`;
    
    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (filters.search) {
      paramCount++;
      conditions.push(`(nome ILIKE $${paramCount} OR cognome ILIKE $${paramCount} OR codice_fiscale ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
    }

    if (filters.sesso) {
      paramCount++;
      conditions.push(`sesso = $${paramCount}`);
      values.push(filters.sesso);
    }

    if (filters.stato_civile) {
      paramCount++;
      conditions.push(`stato_civile = $${paramCount}`);
      values.push(filters.stato_civile);
    }

    if (filters.citta) {
      paramCount++;
      conditions.push(`citta ILIKE $${paramCount}`);
      values.push(`%${filters.citta}%`);
    }

    if (filters.consenso_trattamento_dati) {
      paramCount++;
      conditions.push(`consenso_trattamento_dati = $${paramCount}`);
      values.push(filters.consenso_trattamento_dati);
    }

    // Add age range filter if provided
    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      if (filters.ageMin !== undefined) {
        paramCount++;
        conditions.push(`DATE_PART('year', AGE(data_nascita)) >= $${paramCount}`);
        values.push(filters.ageMin);
      }
      if (filters.ageMax !== undefined) {
        paramCount++;
        conditions.push(`DATE_PART('year', AGE(data_nascita)) <= $${paramCount}`);
        values.push(filters.ageMax);
      }
    }

    // Add date range filter if provided
    if (filters.createdDateFrom) {
      paramCount++;
      conditions.push(`created_at >= $${paramCount}`);
      values.push(filters.createdDateFrom);
    }

    if (filters.createdDateTo) {
      paramCount++;
      conditions.push(`created_at <= $${paramCount}`);
      values.push(filters.createdDateTo);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    try {
      const result = await query(queryText, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }

  // Get patient statistics
  static async getStatistics() {
    try {
      const queryText = `
        SELECT 
          COUNT(*) as total_patients,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_patients,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_patients,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_patients,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_patients,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_patients
        FROM patient.patients
      `;

      const result = await query(queryText);
      const stats = result.rows[0];

      return {
        total_patients: parseInt(stats.total_patients),
        active_patients: parseInt(stats.active_patients),
        inactive_patients: parseInt(stats.inactive_patients),
        today_patients: parseInt(stats.today_patients),
        week_patients: parseInt(stats.week_patients),
        month_patients: parseInt(stats.month_patients),
      };
    } catch (error) {
      console.error("Error getting patient statistics:", error);
      throw error;
    }
  }

  // Update patient
  async update(updateData) {
    const allowedFields = [
      "codice_fiscale",
      "numero_tessera_sanitaria",
      "nome",
      "cognome",
      "data_nascita",
      "luogo_nascita",
      "sesso",
      "indirizzo",
      "citta",
      "cap",
      "provincia",
      "telefono",
      "email",
      "anamnesi_medica",
      "consenso_trattamento_dati",
      "note",
      "medico_curante",
      "sostanza_abuso",
      "abusi_secondari",
      "professione",
      "stato_civile",
      "diagnosi_psichiatrica", 
      "consenso_invio_sts", 
      "is_active",
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        // Convert empty strings to null for integer fields
        let processedValue = value;
        if (key === "medico_curante" && value === "") {
          processedValue = null;
        }

        updates.push(`${key} = $${paramCount}`);
        values.push(processedValue);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error("No valid fields to update");
    }

    values.push(this.id);
    const queryText = `
      UPDATE patient.patients 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);
    const updatedPatient = result.rows[0];

    // Update current instance
    Object.assign(this, updatedPatient);
    return this;
  }

  // Hard delete patient and all related data
  async delete() {
    const queryText = `
      DELETE FROM patient.patients 
      WHERE id = $1
    `;

    await query(queryText, [this.id]);
    // Patient and all related data (clinical records, visits, documents) are automatically deleted due to CASCADE constraints
    return this;
  }

  // Get patient data
  toJSON() {
    return {
      id: this.id,
      codice_fiscale: this.codice_fiscale,
      numero_tessera_sanitaria: this.numero_tessera_sanitaria,
      nome: this.nome,
      cognome: this.cognome,
      data_nascita: this.data_nascita,
      luogo_nascita: this.luogo_nascita,
      sesso: this.sesso,
      indirizzo: this.indirizzo,
      citta: this.citta,
      cap: this.cap,
      provincia: this.provincia,
      telefono: this.telefono,
      email: this.email,
      anamnesi_medica: this.anamnesi_medica,
      consenso_trattamento_dati: this.consenso_trattamento_dati,
      note: this.note,
      diagnosi_psichiatrica: this.diagnosi_psichiatrica, 
      consenso_invio_sts: this.consenso_invio_sts, 
      is_active: this.is_active,
      created_by: this.created_by,
      created_by_username: this.created_by_username,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  // Get public patient data (without sensitive information)
  getPublicData() {
    return {
      id: this.id,
      codice_fiscale: this.codice_fiscale,
      numero_tessera_sanitaria: this.numero_tessera_sanitaria,
      nome: this.nome,
      cognome: this.cognome,
      data_nascita: this.data_nascita,
      luogo_nascita: this.luogo_nascita,
      sesso: this.sesso,
      indirizzo: this.indirizzo,
      citta: this.citta,
      cap: this.cap,
      provincia: this.provincia,
      telefono: this.telefono,
      email: this.email,
      anamnesi_medica: this.anamnesi_medica,
      consenso_trattamento_dati: this.consenso_trattamento_dati,
      note: this.note,
      medico_curante: this.medico_curante,
      medico_curante_username: this.medico_curante_username,
      medico_curante_first_name: this.medico_curante_first_name,
      medico_curante_last_name: this.medico_curante_last_name,
      medico_curante_role: this.medico_curante_role,
      sostanza_abuso: this.sostanza_abuso,
      abusi_secondari: this.abusi_secondari,
      professione: this.professione,
      stato_civile: this.stato_civile,
      diagnosi_psichiatrica: this.diagnosi_psichiatrica, 
      consenso_invio_sts: this.consenso_invio_sts, 
      is_active: this.is_active,
      created_by_username: this.created_by_username,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Patient;
