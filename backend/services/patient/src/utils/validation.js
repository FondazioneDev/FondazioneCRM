class PatientValidationUtils {
  // Validate Codice Fiscale (Italian tax code)
  static validateCodiceFiscale(cf) {
    const errors = [];

    // Codice Fiscale optional - only validate if provided
    if (!cf || cf.trim() === '') {
      // No longer required - just return cleaned null
      return {
        isValid: true,
        errors: [],
        cleaned: null
      };
    }
    
    // Remove spaces and convert to uppercase
    const cleanCf = cf.replace(/\s/g, '').toUpperCase();
    
    if (cleanCf.length !== 16) {
      errors.push('Il Codice Fiscale deve essere di esattamente 16 caratteri');
    }
    
    // Check format: 6 letters, 2 numbers, 1 letter, 2 numbers, 1 letter, 3 numbers, 1 letter
    const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    if (!cfRegex.test(cleanCf)) {
      errors.push('Formato del Codice Fiscale non valido');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      cleaned: cleanCf
    };
  }

  // Validate Numero Tessera Sanitaria
  static validateNumeroTesseraSanitaria(ts, isRequired = true) {
    const errors = [];
    
    if (!ts || ts.trim() === '') {
      if (isRequired) {
        errors.push('Il Numero Tessera Sanitaria è obbligatorio');
      }
    } else {
      // Remove spaces and convert to uppercase
      const cleanTs = ts.replace(/\s/g, '').toUpperCase();
      
      if (cleanTs.length !== 20) {
        errors.push('Il Numero Tessera Sanitaria deve essere di esattamente 20 caratteri');
      }
      
      // Check format: 20 alphanumeric characters
      const tsRegex = /^[A-Z0-9]{20}$/;
      if (!tsRegex.test(cleanTs)) {
        errors.push('Formato del Numero Tessera Sanitaria non valido');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      cleaned: ts ? ts.replace(/\s/g, '').toUpperCase() : null
    };
  }

  // Validate name fields
  static validateName(name, fieldName = 'Nome') {
    const errors = [];
    
    if (!name || name.trim() === '') {
      errors.push(`${fieldName} è obbligatorio`);
    } else {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        errors.push(`${fieldName} deve essere di almeno 2 caratteri`);
      }
      
      if (trimmedName.length > 50) {
        errors.push(`${fieldName} deve essere di massimo 50 caratteri`);
      }
      
      if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmedName)) {
        errors.push(`${fieldName} può contenere solo lettere, spazi, trattini e apostrofi`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate date of birth
  static validateDataNascita(dataNascita) {
    const errors = [];
    
    if (!dataNascita || dataNascita.trim() === '') {
      errors.push('La data di nascita è obbligatoria');
    } else {
      const birthDate = new Date(dataNascita);
      const today = new Date();
      
      if (isNaN(birthDate.getTime())) {
        errors.push('Formato data non valido');
      } else if (birthDate > today) {
        errors.push('La data di nascita non può essere nel futuro');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate sex
  static validateSesso(sesso) {
    const errors = [];
    
    if (!sesso || sesso.trim() === '') {
      errors.push('Il sesso è obbligatorio');
    } else if (!['M', 'F', 'A'].includes(sesso)) {
      errors.push('Il sesso deve essere M, F o A');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate email
  static validateEmail(email) {
    const errors = [];
    
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Formato email non valido');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate phone number
  static validateTelefono(telefono) {
    const errors = [];
    
    if (telefono && telefono.trim() !== '') {
      // Italian phone number validation
      const phoneRegex = /^(\+39|0039|39)?[\s]?[0-9]{2,3}[\s]?[0-9]{6,7}$/;
      if (!phoneRegex.test(telefono.replace(/\s/g, ''))) {
        errors.push('Formato numero di telefono non valido');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate CAP (Italian postal code)
  static validateCAP(cap) {
    const errors = [];

    if (cap && cap.trim() !== '') {
      if (cap.trim().length > 10) {
        errors.push('Il CAP deve essere di massimo 10 caratteri');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate medico curante (clinician) ID
  static validateMedicoCurante(medicoId) {
    const errors = [];
    
    if (medicoId !== null && medicoId !== undefined && medicoId !== '') {
      // Convert to number if it's a string
      const numericId = typeof medicoId === 'string' ? parseInt(medicoId, 10) : medicoId;
      
      if (isNaN(numericId) || numericId <= 0) {
        errors.push('ID del clinico non valido');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate patient creation data
  static validatePatientCreation(data) {
    const errors = [];
    
    // Validate codice_fiscale only if provided (now optional)
    const cfValidation = this.validateCodiceFiscale(data.codice_fiscale);
    if (!cfValidation.isValid) {
      errors.push(...cfValidation.errors);
    }
    
    const tsValidation = this.validateNumeroTesseraSanitaria(data.numero_tessera_sanitaria, false); // Not required
    if (!tsValidation.isValid) {
      errors.push(...tsValidation.errors);
    }
    
    const nomeValidation = this.validateName(data.nome, 'Nome');
    if (!nomeValidation.isValid) {
      errors.push(...nomeValidation.errors);
    }
    
    const cognomeValidation = this.validateName(data.cognome, 'Cognome');
    if (!cognomeValidation.isValid) {
      errors.push(...cognomeValidation.errors);
    }
    
    const dataNascitaValidation = this.validateDataNascita(data.data_nascita);
    if (!dataNascitaValidation.isValid) {
      errors.push(...dataNascitaValidation.errors);
    }
    
    const sessoValidation = this.validateSesso(data.sesso);
    if (!sessoValidation.isValid) {
      errors.push(...sessoValidation.errors);
    }
    
    // Validate optional fields
    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }
    
    const telefonoValidation = this.validateTelefono(data.telefono);
    if (!telefonoValidation.isValid) {
      errors.push(...telefonoValidation.errors);
    }
    
    const capValidation = this.validateCAP(data.cap);
    if (!capValidation.isValid) {
      errors.push(...capValidation.errors);
    }
    
    // Validate medico curante
    const medicoCuranteValidation = this.validateMedicoCurante(data.medico_curante);
    if (!medicoCuranteValidation.isValid) {
      errors.push(...medicoCuranteValidation.errors);
    }
    //consenso_trattamento_dati && consenso_invio_sts can be null, true, or false - no validation needed
    
    return {
      isValid: errors.length === 0,
      errors,
      cleaned: {
        codice_fiscale: cfValidation.cleaned,
        numero_tessera_sanitaria: tsValidation.cleaned
      }
    };
  }

  // Validate patient update data
  static validatePatientUpdate(data) {
    const errors = [];
    
    // Validate codice_fiscale only if provided and not empty
    if (data.codice_fiscale !== undefined) {
      if (data.codice_fiscale === null || data.codice_fiscale === '' || data.codice_fiscale.trim() === '') {
        // Allow empty/null values - convert to null
        data.codice_fiscale = null;
      } else {
        const cfValidation = this.validateCodiceFiscale(data.codice_fiscale);
        if (!cfValidation.isValid) {
          errors.push(...cfValidation.errors);
        }
      }
    }
    
    // For updates, handle Numero Tessera Sanitaria properly
    // Convert empty strings to null to avoid uniqueness constraint violations
    if (data.numero_tessera_sanitaria !== undefined) {
      if (data.numero_tessera_sanitaria === null || data.numero_tessera_sanitaria === '' || data.numero_tessera_sanitaria.trim() === '') {
        // Allow empty values by converting to null
        data.numero_tessera_sanitaria = null;
      } else {
        // Only validate if it looks like a proper Numero Tessera Sanitaria (20 chars)
        // Skip validation for existing invalid data (like Codice Fiscale copied to this field)
        if (data.numero_tessera_sanitaria.length === 20) {
          const tsValidation = this.validateNumeroTesseraSanitaria(data.numero_tessera_sanitaria, false);
          if (!tsValidation.isValid) {
            errors.push(...tsValidation.errors);
          }
        }
      }
    }
    
    if (data.nome !== undefined && data.nome !== null) {
      const nomeValidation = this.validateName(data.nome, 'Nome');
      if (!nomeValidation.isValid) {
        errors.push(...nomeValidation.errors);
      }
    }
    
    if (data.cognome !== undefined && data.cognome !== null) {
      const cognomeValidation = this.validateName(data.cognome, 'Cognome');
      if (!cognomeValidation.isValid) {
        errors.push(...cognomeValidation.errors);
      }
    }
    
    if (data.data_nascita !== undefined && data.data_nascita !== null) {
      const dataNascitaValidation = this.validateDataNascita(data.data_nascita);
      if (!dataNascitaValidation.isValid) {
        errors.push(...dataNascitaValidation.errors);
      }
    }
    
    if (data.sesso !== undefined && data.sesso !== null) {
      const sessoValidation = this.validateSesso(data.sesso);
      if (!sessoValidation.isValid) {
        errors.push(...sessoValidation.errors);
      }
    }
    
    if (data.email !== undefined && data.email !== null) {
      const emailValidation = this.validateEmail(data.email);
      if (!emailValidation.isValid) {
        errors.push(...emailValidation.errors);
      }
    }
    
    if (data.telefono !== undefined && data.telefono !== null) {
      const telefonoValidation = this.validateTelefono(data.telefono);
      if (!telefonoValidation.isValid) {
        errors.push(...telefonoValidation.errors);
      }
    }
    
    if (data.cap !== undefined && data.cap !== null) {
      const capValidation = this.validateCAP(data.cap);
      if (!capValidation.isValid) {
        errors.push(...capValidation.errors);
      }
    }

    // Validate medico curante if provided
    if (data.medico_curante !== undefined) {
      const medicoCuranteValidation = this.validateMedicoCurante(data.medico_curante);
      if (!medicoCuranteValidation.isValid) {
        errors.push(...medicoCuranteValidation.errors);
      }
    }

    // Validate is_active if provided
    if (data.is_active !== undefined && data.is_active !== null) {
      if (typeof data.is_active !== 'boolean') {
        errors.push('is_active deve essere un valore booleano (true/false)');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      cleaned: {
        codice_fiscale: data.codice_fiscale && data.codice_fiscale.trim() !== '' ? this.validateCodiceFiscale(data.codice_fiscale).cleaned : null,
        numero_tessera_sanitaria: data.numero_tessera_sanitaria && data.numero_tessera_sanitaria !== null && data.numero_tessera_sanitaria.trim() !== '' ? this.validateNumeroTesseraSanitaria(data.numero_tessera_sanitaria, false).cleaned : null
      }
    };
  }

  // Sanitize input data
  static sanitizeInput(data) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove leading/trailing whitespace
        sanitized[key] = value.trim();
        
        // Remove potentially dangerous characters
        sanitized[key] = sanitized[key].replace(/[<>]/g, '');
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

module.exports = PatientValidationUtils;
