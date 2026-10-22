# 4.5 TABLE DESIGN (Single Hospital Architecture)

This document provides the complete, normalized (3NF) relational database table specifications for the **MediTwin AI** Hospital & Healthcare Management System, customized for a **single-hospital enterprise deployment** and formatted according to academic project documentation standards.

---

### 1. tbl_login

**Primary key:** `login_id`  
**Foreign key:** `user_id` references table `tbl_user`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | login_id | Int(11) | Primary key, Auto_increment | Unique identifier for login. |
| 2 | email | Varchar(255) | Unique, Not Null | User's registered email address for login authentication. |
| 3 | password | Varchar(255) | Not Null | Securely hashed password string (bcrypt). |
| 4 | status | Enum | Not Null | Used to identify the user is Active, Inactive, or Suspended. |
| 5 | user_id | Int(11) | Foreign Key | References id of tbl_user. |
| 6 | role | Enum | Not Null | Used to identify the user is an admin, doctor, nurse, or patient. |

---

### 2. tbl_user

**Primary key:** `user_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | user_id | Int(11) | Primary Key, Auto_increment | Unique Identifier for users. |
| 2 | name | Varchar(255) | Not Null | User's full name. |
| 3 | phone_no | Varchar(15) | Not Null | User's primary contact phone number. |
| 4 | created_at | Timestamp | Default Current_Timestamp | Timestamp when the user account was registered. |
| 5 | updated_at | Timestamp | Default Current_Timestamp | Timestamp when the user account was last updated. |

---

### 3. tbl_role

**Primary key:** `role_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | role_id | Int(11) | Primary Key, Auto_increment | Unique identifier for system access roles. |
| 2 | role_name | Varchar(50) | Unique, Not Null | Role classification (admin, doctor, nurse, patient). |
| 3 | description | Varchar(255) | Null | Detailed summary of role capabilities and permissions. |

---

### 4. tbl_gender

**Primary key:** `gender_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | gender_id | Int(11) | Primary Key, Auto_increment | Unique identifier for standardized gender. |
| 2 | gender_name | Varchar(20) | Unique, Not Null | Gender classification (Male, Female, Other, Prefer not to say). |

---

### 5. tbl_blood_group

**Primary key:** `blood_group_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | blood_group_id | Int(11) | Primary Key, Auto_increment | Unique identifier for blood group type. |
| 2 | blood_group_name | Varchar(10) | Unique, Not Null | Standard clinical blood group label (A+, A-, B+, B-, AB+, AB-, O+, O-). |

---

### 6. tbl_department

**Primary key:** `department_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | department_id | Int(11) | Primary Key, Auto_increment | Unique identifier for hospital department. |
| 2 | department_name | Varchar(150) | Not Null | Department title (Cardiology, Neurology, Pediatrics, Orthopedics, ICU). |
| 3 | description | Text | Null | Summary of medical services and clinical focus of the department. |

---

### 7. tbl_specialization

**Primary key:** `specialization_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | specialization_id | Int(11) | Primary Key, Auto_increment | Unique identifier for medical specialization. |
| 2 | specialization_name | Varchar(150) | Unique, Not Null | Name of clinical specialty (General Medicine, Cardiology, Neurology, etc.). |

---

### 8. tbl_doctor

**Primary key:** `doctor_id`  
**Foreign key:** `user_id` references table `tbl_user`, `specialization_id` references table `tbl_specialization`, `department_id` references table `tbl_department`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | doctor_id | Int(11) | Primary Key, Auto_increment | Unique identifier for doctor profile. |
| 2 | user_id | Int(11) | Foreign Key, Unique, Not Null | References user_id of tbl_user. |
| 3 | first_name | Varchar(100) | Not Null | Doctor's first name. |
| 4 | last_name | Varchar(100) | Not Null | Doctor's last name or surname. |
| 5 | specialization_id | Int(11) | Foreign Key, Not Null | References specialization_id of tbl_specialization. |
| 6 | department_id | Int(11) | Foreign Key, Not Null | References department_id of tbl_department. |
| 7 | license_number | Varchar(100) | Unique, Not Null | Official state/national medical practitioner council registration number. |
| 8 | phone | Varchar(20) | Not Null | Doctor's direct professional telephone number. |
| 9 | years_of_experience | Int(11) | Not Null | Total number of years practicing clinical medicine. |
| 10 | created_at | Timestamp | Default Current_Timestamp | Record registration timestamp. |

---

### 9. tbl_nurse

**Primary key:** `nurse_id`  
**Foreign key:** `user_id` references table `tbl_user`, `department_id` references table `tbl_department`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | nurse_id | Int(11) | Primary Key, Auto_increment | Unique identifier for nurse record. |
| 2 | user_id | Int(11) | Foreign Key, Unique, Not Null | References user_id of tbl_user. |
| 3 | first_name | Varchar(100) | Not Null | Nurse's first name. |
| 4 | last_name | Varchar(100) | Not Null | Nurse's last name. |
| 5 | department_id | Int(11) | Foreign Key, Not Null | References department_id of tbl_department. |
| 6 | license_number | Varchar(100) | Unique, Not Null | Nursing council official license number. |
| 7 | nurse_code | Varchar(50) | Unique, Not Null | Internal hospital employee badge identification code. |
| 8 | registration_number | Varchar(100) | Unique, Not Null | Registered Nurse (RN) statutory credential number. |
| 9 | assigned_ward | Varchar(100) | Null | Hospital inpatient ward or nursing station assigned for duties. |
| 10 | phone | Varchar(20) | Not Null | Nurse's contact telephone number. |

---

### 10. tbl_admin

**Primary key:** `admin_id`  
**Foreign key:** `user_id` references table `tbl_user`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | admin_id | Int(11) | Primary Key, Auto_increment | Unique identifier for administrator record. |
| 2 | user_id | Int(11) | Foreign Key, Unique, Not Null | References user_id of tbl_user. |
| 3 | first_name | Varchar(100) | Not Null | Administrator's first name. |
| 4 | last_name | Varchar(100) | Not Null | Administrator's last name. |
| 5 | phone | Varchar(20) | Not Null | Administrator's direct telephone contact number. |
| 6 | created_at | Timestamp | Default Current_Timestamp | Administrative account registration timestamp. |

---

### 11. tbl_patient

**Primary key:** `patient_id`  
**Foreign key:** `user_id` references table `tbl_user`, `gender_id` references table `tbl_gender`, `blood_group_id` references table `tbl_blood_group`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | patient_id | Int(11) | Primary Key, Auto_increment | Unique identifier for patient health profile. |
| 2 | user_id | Int(11) | Foreign Key, Unique, Not Null | References user_id of tbl_user. |
| 3 | first_name | Varchar(100) | Not Null | Patient's given first name. |
| 4 | last_name | Varchar(100) | Not Null | Patient's family name or surname. |
| 5 | date_of_birth | Date | Not Null | Legal calendar birth date used for age calculations. |
| 6 | gender_id | Int(11) | Foreign Key, Not Null | References gender_id of tbl_gender. |
| 7 | blood_group_id | Int(11) | Foreign Key, Not Null | References blood_group_id of tbl_blood_group. |
| 8 | phone | Varchar(20) | Not Null | Patient contact telephone number. |
| 9 | address | Text | Not Null | Residential street address. |
| 10 | city | Varchar(100) | Not Null | City of residence. |
| 11 | state | Varchar(100) | Not Null | State or administrative district. |
| 12 | emergency_contact_name | Varchar(200) | Not Null | Full name of appointed emergency contact person. |
| 13 | emergency_contact_phone | Varchar(20) | Not Null | Phone number of emergency contact. |
| 14 | admission_status | Varchar(50) | Not Null | Current hospital care status (Outpatient, Inpatient, Discharged). |

---

### 12. tbl_doctor_availability

**Primary key:** `availability_id`  
**Foreign key:** `doctor_id` references table `tbl_doctor`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | availability_id | Int(11) | Primary Key, Auto_increment | Unique identifier for doctor schedule entry. |
| 2 | doctor_id | Int(11) | Foreign Key, Not Null | References doctor_id of tbl_doctor. |
| 3 | date | Date | Not Null | Calendar date for the clinical duty shift. |
| 4 | status | Varchar(50) | Not Null | Duty roster state (AVAILABLE, ON_LEAVE, BUSY). |
| 5 | start_time | Varchar(10) | Not Null | Duty start time (e.g., 09:00). |
| 6 | end_time | Varchar(10) | Not Null | Duty end time (e.g., 17:00). |
| 7 | reason | Varchar(255) | Null | Stated justification if doctor is on leave or unavailable. |

---

### 13. tbl_appointment_status

**Primary key:** `status_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | status_id | Int(11) | Primary Key, Auto_increment | Unique identifier for appointment status. |
| 2 | name | Varchar(50) | Unique, Not Null | Appointment state designation (scheduled, completed, cancelled, no_show). |

---

### 14. tbl_appointment

**Primary key:** `appointment_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `doctor_id` references table `tbl_doctor`, `status_id` references table `tbl_appointment_status`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | appointment_id | Int(11) | Primary Key, Auto_increment | Unique identifier for appointment booking. |
| 2 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 3 | doctor_id | Int(11) | Foreign Key, Not Null | References doctor_id of tbl_doctor. |
| 4 | appointment_date | Date | Not Null | Calendar date of scheduled clinical visit. |
| 5 | appointment_time | Time | Not Null | Time slot for clinical consultation. |
| 6 | status_id | Int(11) | Foreign Key, Not Null | References status_id of tbl_appointment_status. |
| 7 | reason | Text | Not Null | Primary medical complaint or reason for booking. |
| 8 | notes | Text | Null | Physician clinical findings, observations, or preparatory notes. |

---

### 15. tbl_medicine

**Primary key:** `medicine_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | medicine_id | Int(11) | Primary Key, Auto_increment | Unique identifier for pharmaceutical medicine. |
| 2 | name | Varchar(255) | Not Null | Commercial brand name of the drug. |
| 3 | generic_name | Varchar(255) | Null | Standard generic pharmaceutical salt composition name. |
| 4 | category | Varchar(100) | Not Null | Drug classification (Antibiotic, Analgesic, Antipyretic, Antihypertensive). |
| 5 | unit | Varchar(50) | Not Null | Dispensation package unit (Tablet, Capsule, Syrup, Injection, Cream). |
| 6 | description | Text | Null | Pharmacological overview, storage guidelines, and contraindications. |

---

### 16. tbl_prescription

**Primary key:** `prescription_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `doctor_id` references table `tbl_doctor`, `appointment_id` references table `tbl_appointment`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | prescription_id | Int(11) | Primary Key, Auto_increment | Unique identifier for medical prescription header. |
| 2 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 3 | doctor_id | Int(11) | Foreign Key, Not Null | References doctor_id of tbl_doctor. |
| 4 | appointment_id | Int(11) | Foreign Key, Null | References appointment_id of tbl_appointment. |
| 5 | diagnosis | Text | Not Null | Clinical diagnostic conclusion determined by physician. |
| 6 | notes | Text | Null | Physician remarks, dietary suggestions, and recovery advice. |
| 7 | prescribed_date | Date | Not Null | Calendar date prescription was formally issued. |
| 8 | valid_until | Date | Null | Prescription validity or pharmacy dispensing expiration date. |

---

### 17. tbl_prescription_item

**Primary key:** `item_id`  
**Foreign key:** `prescription_id` references table `tbl_prescription`, `medicine_id` references table `tbl_medicine`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | item_id | Int(11) | Primary Key, Auto_increment | Unique identifier for prescription line item. |
| 2 | prescription_id | Int(11) | Foreign Key, Not Null | References prescription_id of tbl_prescription. |
| 3 | medicine_id | Int(11) | Foreign Key, Not Null | References medicine_id of tbl_medicine. |
| 4 | dosage | Varchar(100) | Not Null | Specific strength and dosage quantity (e.g., 500mg, 1 tablet). |
| 5 | frequency | Varchar(100) | Not Null | Schedule frequency (e.g., Once daily, 1-0-1, Every 8 hours). |
| 6 | duration_days | Int(11) | Not Null | Number of days the drug should be consumed. |
| 7 | instructions | Text | Null | Consumption instructions (e.g., Take after food with warm water). |

---

### 18. tbl_record_type

**Primary key:** `record_type_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | record_type_id | Int(11) | Primary Key, Auto_increment | Unique identifier for clinical record type. |
| 2 | name | Varchar(100) | Unique, Not Null | Record classification (consultation, lab_result, surgery, radiology, vaccination). |

---

### 19. tbl_medical_record

**Primary key:** `record_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `doctor_id` references table `tbl_doctor`, `appointment_id` references table `tbl_appointment`, `record_type_id` references table `tbl_record_type`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | record_id | Int(11) | Primary Key, Auto_increment | Unique identifier for electronic health record. |
| 2 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 3 | doctor_id | Int(11) | Foreign Key, Not Null | References doctor_id of tbl_doctor. |
| 4 | appointment_id | Int(11) | Foreign Key, Null | References appointment_id of tbl_appointment. |
| 5 | record_type_id | Int(11) | Foreign Key, Not Null | References record_type_id of tbl_record_type. |
| 6 | title | Varchar(255) | Not Null | Short descriptive title of the medical examination. |
| 7 | description | Text | Not Null | Comprehensive clinical findings, exam notes, and evaluations. |
| 8 | record_date | Date | Not Null | Calendar date the examination or procedure took place. |

---

### 20. tbl_document_type

**Primary key:** `document_type_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | document_type_id | Int(11) | Primary Key, Auto_increment | Unique identifier for document format type. |
| 2 | name | Varchar(100) | Unique, Not Null | Document classification (X-Ray, MRI, Lab Report, ECG, Prescription_PDF). |

---

### 21. tbl_medical_document

**Primary key:** `document_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `record_id` references table `tbl_medical_record`, `document_type_id` references table `tbl_document_type`, `uploaded_by_id` references table `tbl_user`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | document_id | Int(11) | Primary Key, Auto_increment | Unique identifier for uploaded medical document. |
| 2 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 3 | record_id | Int(11) | Foreign Key, Null | References record_id of tbl_medical_record. |
| 4 | document_type_id | Int(11) | Foreign Key, Not Null | References document_type_id of tbl_document_type. |
| 5 | file_name | Varchar(255) | Not Null | Original filename of the stored diagnostic document. |
| 6 | file_path | Text | Not Null | Secure Cloudinary URL or local file storage system path. |
| 7 | file_size_kb | Int(11) | Not Null | File storage footprint size measured in kilobytes. |
| 8 | uploaded_by_id | Int(11) | Foreign Key, Not Null | References user_id of tbl_user who performed file upload. |
| 9 | uploaded_at | Timestamp | Default Current_Timestamp | Timestamp when document was stored in system. |

---

### 22. tbl_ward

**Primary key:** `ward_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | ward_id | Int(11) | Primary Key, Auto_increment | Unique identifier for hospital inpatient ward. |
| 2 | ward_number | Varchar(50) | Unique, Not Null | Distinct clinical ward code (e.g., WARD-GEN-A, ICU-01). |
| 3 | name | Varchar(150) | Not Null | Designation name of the ward (e.g., General Ward, Post-Op Care). |
| 4 | department | Varchar(150) | Null | Medical department supervising the ward operations. |
| 5 | total_beds | Int(11) | Not Null | Total bed installation capacity in this ward. |
| 6 | is_active | Boolean | Default True | Operational availability status of the ward. |

---

### 23. tbl_bed

**Primary key:** `bed_id`  
**Foreign key:** `ward_id` references table `tbl_ward`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | bed_id | Int(11) | Primary Key, Auto_increment | Unique identifier for hospital bed. |
| 2 | ward_id | Int(11) | Foreign Key, Not Null | References ward_id of tbl_ward. |
| 3 | bed_number | Varchar(50) | Not Null | Physical bed identifier code (e.g., B-101, ICU-04). |
| 4 | status | Varchar(50) | Not Null | Current occupancy state (AVAILABLE, OCCUPIED, MAINTENANCE). |

---

### 24. tbl_inpatient_admission

**Primary key:** `admission_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `admitting_doctor_id` references table `tbl_doctor`, `ward_id` references table `tbl_ward`, `bed_id` references table `tbl_bed`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | admission_id | Int(11) | Primary Key, Auto_increment | Unique identifier for inpatient admission record. |
| 2 | admission_number | Varchar(50) | Unique, Not Null | Formal admission case identification number. |
| 3 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 4 | admitting_doctor_id | Int(11) | Foreign Key, Not Null | References doctor_id of tbl_doctor who admitted patient. |
| 5 | ward_id | Int(11) | Foreign Key, Not Null | References ward_id of tbl_ward. |
| 6 | bed_id | Int(11) | Foreign Key, Not Null | References bed_id of assigned tbl_bed. |
| 7 | admission_date_time | Timestamp | Default Current_Timestamp | Exact date and time when patient was admitted. |
| 8 | admission_diagnosis | Varchar(255) | Not Null | Provisional medical diagnosis justifying inpatient stay. |
| 9 | chief_complaint | Text | Not Null | Clinical symptoms presented upon emergency/ward arrival. |
| 10 | admission_status | Varchar(50) | Not Null | Inpatient status (ADMITTED, TRANSFERRED, DISCHARGED). |
| 11 | acuity_level | Varchar(50) | Not Null | Clinical urgency level (CRITICAL, MODERATE, STABLE). |
| 12 | discharge_date | Timestamp | Null | Timestamp of formal medical discharge from hospital. |

---

### 25. tbl_bed_transfer_history

**Primary key:** `transfer_id`  
**Foreign key:** `admission_id` references table `tbl_inpatient_admission`, `from_ward_id` references table `tbl_ward`, `from_bed_id` references table `tbl_bed`, `to_ward_id` references table `tbl_ward`, `to_bed_id` references table `tbl_bed`, `transferred_by_id` references table `tbl_user`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | transfer_id | Int(11) | Primary Key, Auto_increment | Unique identifier for bed transfer audit trail. |
| 2 | admission_id | Int(11) | Foreign Key, Not Null | References admission_id of tbl_inpatient_admission. |
| 3 | from_ward_id | Int(11) | Foreign Key, Not Null | References ward_id of origin ward. |
| 4 | from_bed_id | Int(11) | Foreign Key, Not Null | References bed_id of origin bed. |
| 5 | to_ward_id | Int(11) | Foreign Key, Not Null | References ward_id of target ward. |
| 6 | to_bed_id | Int(11) | Foreign Key, Not Null | References bed_id of target bed. |
| 7 | transfer_reason | Varchar(255) | Null | Clinical or administrative justification for patient transfer. |
| 8 | transferred_by_id | Int(11) | Foreign Key, Not Null | References user_id of authorized staff who initiated move. |
| 9 | transferred_at | Timestamp | Default Current_Timestamp | Timestamp when patient bed transfer was executed. |

---

### 26. tbl_patient_observation

**Primary key:** `observation_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `nurse_id` references table `tbl_nurse`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | observation_id | Int(11) | Primary Key, Auto_increment | Unique identifier for vital signs observation record. |
| 2 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 3 | nurse_id | Int(11) | Foreign Key, Not Null | References nurse_id of tbl_nurse who recorded vitals. |
| 4 | observation_date | Date | Not Null | Calendar date observation was conducted. |
| 5 | observation_time | Time | Not Null | Time of vitals recording. |
| 6 | temperature | Decimal(5,2) | Not Null | Body temperature measurement in Fahrenheit / Celsius. |
| 7 | pulse_rate | Int(11) | Not Null | Heart pulse rate in beats per minute (BPM). |
| 8 | respiratory_rate | Int(11) | Not Null | Respiratory rate in breaths per minute. |
| 9 | systolic_bp | Int(11) | Not Null | Systolic blood pressure in mmHg. |
| 10 | diastolic_bp | Int(11) | Not Null | Diastolic blood pressure in mmHg. |
| 11 | spo2 | Decimal(5,2) | Not Null | Peripheral arterial oxygen saturation (%). |
| 12 | blood_glucose | Decimal(7,2) | Null | Blood sugar concentration in mg/dL. |
| 13 | weight | Decimal(6,2) | Null | Patient body weight in kilograms. |
| 14 | pain_score | Int(11) | Null | Visual / numeric pain rating score (0 to 10). |
| 15 | consciousness_level | Varchar(50) | Not Null | Consciousness status (Alert, Confused, Drowsy, Unresponsive). |
| 16 | general_observation | Text | Null | Clinical nursing evaluation notes on patient condition. |

---

### 27. tbl_discharge_summary

**Primary key:** `summary_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `doctor_id` references table `tbl_doctor`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | summary_id | Int(11) | Primary Key, Auto_increment | Unique identifier for patient discharge summary. |
| 2 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 3 | doctor_id | Int(11) | Foreign Key, Not Null | References doctor_id of attending physician. |
| 4 | admission_date | Date | Not Null | Date of inpatient hospital admission. |
| 5 | discharge_date | Date | Not Null | Date patient was certified for discharge. |
| 6 | admission_diagnosis | Varchar(255) | Null | Provisional diagnosis documented upon admission. |
| 7 | discharge_diagnosis | Varchar(255) | Not Null | Final confirmed diagnosis at completion of stay. |
| 8 | clinical_course | Text | Not Null | Narrative summary of treatments and inpatient clinical course. |
| 9 | condition_at_discharge | Varchar(100) | Not Null | Physical status at discharge (Improved, Stable, Cured). |
| 10 | follow_up_instructions | Text | Null | Post-discharge rehabilitation and medical instructions. |
| 11 | follow_up_date | Date | Null | Recommended date for clinical follow-up review. |
| 12 | summary_status | Varchar(50) | Not Null | Discharge summary document status (DRAFT, FINALIZED). |

---

### 28. tbl_nursing_patient_summary

**Primary key:** `summary_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `nurse_id` references table `tbl_nurse`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | summary_id | Int(11) | Primary Key, Auto_increment | Unique identifier for nursing shift handover report. |
| 2 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 3 | nurse_id | Int(11) | Foreign Key, Not Null | References nurse_id of authoring nurse. |
| 4 | summary_date | Date | Not Null | Calendar date of nursing shift handover. |
| 5 | patient_current_condition | Varchar(255) | Not Null | Physical condition and mobility assessment. |
| 6 | level_of_consciousness | Varchar(50) | Null | Mental alertness and neurological response status. |
| 7 | vital_signs_summary | Text | Null | Overview of vital signs observed throughout the shift. |
| 8 | nursing_care_provided | Text | Null | Care interventions, dressings, and medication delivery administered. |
| 9 | status | Varchar(50) | Not Null | Handover report state (DRAFT, FINALIZED). |

---

### 29. tbl_reminder_status

**Primary key:** `status_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | status_id | Int(11) | Primary Key, Auto_increment | Unique identifier for medication reminder status. |
| 2 | name | Varchar(50) | Unique, Not Null | Reminder status (ACTIVE, TAKEN, MISSED, CANCELLED). |

---

### 30. tbl_medicine_reminder

**Primary key:** `reminder_id`  
**Foreign key:** `patient_id` references table `tbl_patient`, `medicine_id` references table `tbl_medicine`, `status_id` references table `tbl_reminder_status`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | reminder_id | Int(11) | Primary Key, Auto_increment | Unique identifier for medication reminder alert. |
| 2 | patient_id | Int(11) | Foreign Key, Not Null | References patient_id of tbl_patient. |
| 3 | medicine_id | Int(11) | Foreign Key, Not Null | References medicine_id of tbl_medicine. |
| 4 | reminder_time | Time | Not Null | Daily scheduled alert time for medication intake. |
| 5 | frequency | Varchar(100) | Not Null | Administration schedule (Once daily, Twice daily, Every 8 hours). |
| 6 | start_date | Date | Not Null | Commencement date for reminder alerts. |
| 7 | end_date | Date | Null | Concluding date for medication schedule. |
| 8 | status_id | Int(11) | Foreign Key, Not Null | References status_id of tbl_reminder_status. |

---

### 31. tbl_notification_type

**Primary key:** `notification_type_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | notification_type_id | Int(11) | Primary Key, Auto_increment | Unique identifier for notification category. |
| 2 | name | Varchar(100) | Unique, Not Null | Category classification (APPOINTMENT, PRESCRIPTION, REMINDER, SYSTEM). |

---

### 32. tbl_notification

**Primary key:** `notification_id`  
**Foreign key:** `user_id` references table `tbl_user`, `notification_type_id` references table `tbl_notification_type`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | notification_id | Int(11) | Primary Key, Auto_increment | Unique identifier for system user notification. |
| 2 | user_id | Int(11) | Foreign Key, Not Null | References user_id of recipient tbl_user. |
| 3 | notification_type_id | Int(11) | Foreign Key, Not Null | References notification_type_id of tbl_notification_type. |
| 4 | title | Varchar(255) | Not Null | Subject title of the notification message. |
| 5 | message | Text | Not Null | Full textual body of the alert notification. |
| 6 | is_read | Boolean | Default False | Read acknowledgment status flag. |
| 7 | created_at | Timestamp | Default Current_Timestamp | Timestamp when notification was created. |

---

### 33. tbl_hospital_procedure

**Primary key:** `procedure_id`  
**Foreign key:** `department_id` references table `tbl_department`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | procedure_id | Int(11) | Primary Key, Auto_increment | Unique identifier for hospital procedure / protocol. |
| 2 | department_id | Int(11) | Foreign Key, Null | References department_id of tbl_department. |
| 3 | title | Varchar(255) | Not Null | Official clinical procedure protocol title. |
| 4 | procedure_code | Varchar(50) | Unique, Not Null | Hospital protocol reference code (e.g., SOP-CARD-01). |
| 5 | category | Varchar(100) | Not Null | Protocol category (Emergency, Infection Control, Surgical). |
| 6 | version | Varchar(50) | Not Null | Protocol version number (e.g., 1.0, 2.0). |
| 7 | status | Varchar(50) | Not Null | Review status (PUBLISHED, DRAFT, UNDER_REVIEW). |
| 8 | effective_date | Date | Not Null | Effective implementation date for protocol. |

---

### 34. tbl_action_type

**Primary key:** `action_type_id`  
**Foreign key:** Nil

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | action_type_id | Int(11) | Primary Key, Auto_increment | Unique identifier for audit action type. |
| 2 | name | Varchar(50) | Unique, Not Null | Action classification (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT). |

---

### 35. tbl_audit_log

**Primary key:** `audit_id`  
**Foreign key:** `user_id` references table `tbl_user`, `action_type_id` references table `tbl_action_type`

| No: | Field name | Datatype (Size) | Key Constraints | Description of the field |
| :---: | :---: | :---: | :---: | :---: |
| 1 | audit_id | Int(11) | Primary Key, Auto_increment | Unique identifier for system audit log. |
| 2 | user_id | Int(11) | Foreign Key, Null | References user_id of tbl_user who performed operation. |
| 3 | action_type_id | Int(11) | Foreign Key, Not Null | References action_type_id of tbl_action_type. |
| 4 | table_name | Varchar(100) | Not Null | Database entity table affected by the action. |
| 5 | record_id | Int(11) | Null | Primary key ID altered in the target table. |
| 6 | ip_address | Varchar(45) | Null | Network client IP address of requester. |
| 7 | created_at | Timestamp | Default Current_Timestamp | Timestamp when audit event occurred. |
