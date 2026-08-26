-- ======================================================
-- MediTwin AI — 3NF PostgreSQL Database DDL Script
-- Total Tables: 26
-- ======================================================

-- ------------------------------------------------------
-- Domain 1: Auth & Roles
-- ------------------------------------------------------

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES ('patient'), ('doctor'), ('nurse'), ('admin');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------
-- Domain 2: Profiles & Lookups
-- ------------------------------------------------------

CREATE TABLE genders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);
INSERT INTO genders (name) VALUES ('Male'), ('Female'), ('Other'), ('Prefer not to say');

CREATE TABLE blood_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) UNIQUE NOT NULL
);
INSERT INTO blood_groups (name) VALUES ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-');

CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender_id INT REFERENCES genders(id),
    blood_group_id INT REFERENCES blood_groups(id),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE specializations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);
INSERT INTO specializations (name) VALUES ('Cardiology'), ('Neurology'), ('Pediatrics'), ('Orthopedics'), ('General Medicine'), ('Dermatology');

CREATE TABLE hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT
);

CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialization_id INT REFERENCES specializations(id),
    department_id INT REFERENCES departments(id),
    license_number VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    years_of_experience INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE nurses (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department_id INT REFERENCES departments(id),
    license_number VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    hospital_id INT REFERENCES hospitals(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------
-- Domain 3: Appointments
-- ------------------------------------------------------

CREATE TABLE appointment_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO appointment_statuses (name) VALUES ('scheduled'), ('completed'), ('cancelled'), ('no_show');

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    doctor_id INT NOT NULL REFERENCES doctors(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status_id INT NOT NULL REFERENCES appointment_statuses(id),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------
-- Domain 4: Prescriptions & Medicines
-- ------------------------------------------------------

CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100),
    unit VARCHAR(50),
    description TEXT
);

CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    doctor_id INT NOT NULL REFERENCES doctors(id),
    appointment_id INT REFERENCES appointments(id),
    diagnosis TEXT,
    notes TEXT,
    prescribed_date DATE NOT NULL,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prescription_items (
    id SERIAL PRIMARY KEY,
    prescription_id INT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id INT NOT NULL REFERENCES medicines(id),
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100),
    duration_days INT,
    instructions TEXT
);

-- ------------------------------------------------------
-- Domain 5: Medical Records & Documents
-- ------------------------------------------------------

CREATE TABLE record_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);
INSERT INTO record_types (name) VALUES ('consultation'), ('lab_result'), ('surgery'), ('radiology'), ('vaccination');

CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    doctor_id INT NOT NULL REFERENCES doctors(id),
    appointment_id INT REFERENCES appointments(id),
    record_type_id INT NOT NULL REFERENCES record_types(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    record_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);
INSERT INTO document_types (name) VALUES ('X-Ray'), ('MRI'), ('Lab Report'), ('ECG'), ('Prescription_PDF');

CREATE TABLE medical_documents (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    record_id INT REFERENCES medical_records(id),
    document_type_id INT NOT NULL REFERENCES document_types(id),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_kb INT,
    uploaded_by_id INT NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------
-- Domain 6: Reminders & Notifications
-- ------------------------------------------------------

CREATE TABLE reminder_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO reminder_statuses (name) VALUES ('active'), ('completed'), ('dismissed');

CREATE TABLE medicine_reminders (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    prescription_item_id INT REFERENCES prescription_items(id),
    medicine_id INT NOT NULL REFERENCES medicines(id),
    reminder_time TIME NOT NULL,
    frequency VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    status_id INT NOT NULL REFERENCES reminder_statuses(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);
INSERT INTO notification_types (name) VALUES ('appointment'), ('reminder'), ('system'), ('alert'), ('lab_result');

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type_id INT NOT NULL REFERENCES notification_types(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------
-- Domain 7: Audit Logs
-- ------------------------------------------------------

CREATE TABLE action_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO action_types (name) VALUES ('CREATE'), ('READ'), ('UPDATE'), ('DELETE'), ('LOGIN'), ('LOGOUT');

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action_type_id INT NOT NULL REFERENCES action_types(id),
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------
-- Domain 9: Nursing — Patient Observations & Vital Signs
-- ------------------------------------------------------

CREATE TABLE patient_observations (
    id                  SERIAL PRIMARY KEY,
    patient_id          INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    nurse_id            INT NOT NULL REFERENCES nurses(id) ON DELETE RESTRICT,
    observation_date    DATE NOT NULL,
    observation_time    TIME NOT NULL,
    temperature         NUMERIC(5,2) NOT NULL,
    pulse_rate          INT NOT NULL,
    respiratory_rate    INT NOT NULL,
    systolic_bp         INT NOT NULL,
    diastolic_bp        INT NOT NULL,
    spo2                NUMERIC(5,2) NOT NULL,
    blood_glucose       NUMERIC(7,2),
    weight              NUMERIC(6,2),
    pain_score          INT CHECK (pain_score >= 0 AND pain_score <= 10),
    consciousness_level VARCHAR(50) CHECK (consciousness_level IN ('Alert', 'Confused', 'Drowsy', 'Unresponsive')),
    general_observation TEXT,
    additional_notes    TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patient_observations_patient_id ON patient_observations(patient_id);
CREATE INDEX idx_patient_observations_nurse_id   ON patient_observations(nurse_id);
CREATE INDEX idx_patient_observations_date       ON patient_observations(observation_date);

