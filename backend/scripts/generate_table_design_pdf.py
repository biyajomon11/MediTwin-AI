import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and display total page count:
    'Page X of Y' on academic project report footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Times-Roman", 9)
        self.setFillColor(colors.HexColor("#333333"))
        
        # Header (Top running head)
        self.setStrokeColor(colors.HexColor("#888888"))
        self.setLineWidth(0.5)
        self.line(40, A4[1] - 32, A4[0] - 40, A4[1] - 32)
        self.drawString(40, A4[1] - 28, "MediTwin AI — Healthcare Management System")
        self.drawRightString(A4[0] - 40, A4[1] - 28, "Database Design Specification (3NF)")
        
        # Footer
        self.line(40, 36, A4[0] - 40, 36)
        self.drawString(40, 24, "4.5 Table Design")
        self.drawRightString(A4[0] - 40, 24, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_pdf(output_pdf_path):
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    # Academic Typography Styles matching the user's image
    title_style = ParagraphStyle(
        'SectionTitle',
        fontName='Times-Bold',
        fontSize=15,
        leading=18,
        spaceAfter=14,
        textColor=colors.black
    )

    tbl_title_style = ParagraphStyle(
        'TblTitle',
        fontName='Times-Bold',
        fontSize=11,
        leading=15,
        spaceBefore=10,
        spaceAfter=4,
        textColor=colors.black
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        fontName='Times-Roman',
        fontSize=10,
        leading=14,
        spaceAfter=3,
        textColor=colors.black
    )

    col_header_style = ParagraphStyle(
        'ColHeader',
        fontName='Times-Bold',
        fontSize=9.5,
        leading=12,
        alignment=1, # Centered
        textColor=colors.black
    )

    cell_center = ParagraphStyle(
        'CellCenter',
        fontName='Times-Roman',
        fontSize=9,
        leading=11.5,
        alignment=1, # Centered
        textColor=colors.black
    )

    cell_left = ParagraphStyle(
        'CellLeft',
        fontName='Times-Roman',
        fontSize=9,
        leading=11.5,
        alignment=0, # Left
        textColor=colors.black
    )

    tables_data = [
        # 1. tbl_login
        {
            "name": "1.tbl_login",
            "pk": "login_id",
            "fk": "user_id references table tbl_user",
            "rows": [
                ["1", "login_id", "Int(11)", "Primary key, Auto_increment", "Unique identifier for login."],
                ["2", "email", "Varchar(255)", "Unique, Not Null", "User's email address."],
                ["3", "password", "Varchar(255)", "Not Null", "Encrypted Password"],
                ["4", "status", "Enum", "Not Null", "Used to identify the user is Active or Inactive."],
                ["5", "user_id", "Int(11)", "Foreign Key", "References id of tbl_user."],
                ["6", "role", "Enum", "Not Null", "Used to identify the user is an admin, doctor, nurse, or patient."]
            ]
        },

        # 2. tbl_user
        {
            "name": "2.tbl_user",
            "pk": "user_id",
            "fk": "Nil",
            "rows": [
                ["1", "user_id", "Int(11)", "Primary Key, Auto_increment", "Unique Identifier for users."],
                ["2", "name", "Varchar(255)", "Not Null", "User's full legal name."],
                ["3", "phone_no", "Varchar(15)", "Not Null", "User's primary contact phone number."],
                ["4", "gender_id", "Int(11)", "Foreign Key, Null", "References id of tbl_gender."],
                ["5", "created_at", "Timestamp", "Default Current_Timestamp", "User profile registration timestamp."],
                ["6", "updated_at", "Timestamp", "Default Current_Timestamp", "Timestamp when profile was last modified."]
            ]
        },

        # 3. tbl_role
        {
            "name": "3.tbl_role",
            "pk": "role_id",
            "fk": "Nil",
            "rows": [
                ["1", "role_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for system user roles."],
                ["2", "role_name", "Varchar(50)", "Unique, Not Null", "System role title (admin, doctor, nurse, patient)."],
                ["3", "description", "Varchar(255)", "Null", "Detailed description of role responsibilities."]
            ]
        },

        # 4. tbl_gender
        {
            "name": "4.tbl_gender",
            "pk": "gender_id",
            "fk": "Nil",
            "rows": [
                ["1", "gender_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for standardized gender."],
                ["2", "gender_name", "Varchar(20)", "Unique, Not Null", "Gender classification (Male, Female, Other)."]
            ]
        },

        # 5. tbl_blood_group
        {
            "name": "5.tbl_blood_group",
            "pk": "blood_group_id",
            "fk": "Nil",
            "rows": [
                ["1", "blood_group_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for blood group type."],
                ["2", "blood_group_name", "Varchar(10)", "Unique, Not Null", "Standard ABO/Rh blood group (A+, B+, O+, AB-, etc.)."]
            ]
        },

        # 6. tbl_hospital
        {
            "name": "6.tbl_hospital",
            "pk": "hospital_id",
            "fk": "Nil",
            "rows": [
                ["1", "hospital_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for the hospital entity."],
                ["2", "hospital_name", "Varchar(255)", "Not Null", "Official name of the hospital or healthcare center."],
                ["3", "address", "Text", "Not Null", "Physical geographic street address."],
                ["4", "city", "Varchar(100)", "Not Null", "City in which the hospital is located."],
                ["5", "state", "Varchar(100)", "Not Null", "State or administrative division."],
                ["6", "phone_no", "Varchar(20)", "Not Null", "Hospital central contact telephone number."],
                ["7", "email", "Varchar(255)", "Unique, Not Null", "Hospital official inquiries email address."]
            ]
        },

        # 7. tbl_department
        {
            "name": "7.tbl_department",
            "pk": "department_id",
            "fk": "hospital_id references table tbl_hospital",
            "rows": [
                ["1", "department_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for hospital clinical department."],
                ["2", "hospital_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_hospital."],
                ["3", "department_name", "Varchar(150)", "Not Null", "Department title (Cardiology, Neurology, ICU, etc.)."],
                ["4", "description", "Text", "Null", "Scope of clinical operations and care provided."]
            ]
        },

        # 8. tbl_specialization
        {
            "name": "8.tbl_specialization",
            "pk": "specialization_id",
            "fk": "Nil",
            "rows": [
                ["1", "specialization_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for clinical specialization."],
                ["2", "specialization_name", "Varchar(150)", "Unique, Not Null", "Medical field title (General Medicine, Pediatrics, etc.)."]
            ]
        },

        # 9. tbl_doctor
        {
            "name": "9.tbl_doctor",
            "pk": "doctor_id",
            "fk": "user_id references table tbl_user, specialization_id references table tbl_specialization, department_id references table tbl_department",
            "rows": [
                ["1", "doctor_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for doctor records."],
                ["2", "user_id", "Int(11)", "Foreign Key, Unique, Not Null", "References id of tbl_user."],
                ["3", "specialization_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_specialization."],
                ["4", "department_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_department."],
                ["5", "license_number", "Varchar(100)", "Unique, Not Null", "Government medical practitioner license registration."],
                ["6", "phone", "Varchar(20)", "Not Null", "Doctor direct clinical contact telephone number."],
                ["7", "years_of_experience", "Int(11)", "Not Null", "Total number of years practicing medicine."],
                ["8", "created_at", "Timestamp", "Default Current_Timestamp", "Doctor profile registration timestamp."]
            ]
        },

        # 10. tbl_nurse
        {
            "name": "10.tbl_nurse",
            "pk": "nurse_id",
            "fk": "user_id references table tbl_user, department_id references table tbl_department",
            "rows": [
                ["1", "nurse_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for nurse profile."],
                ["2", "user_id", "Int(11)", "Foreign Key, Unique, Not Null", "References id of tbl_user."],
                ["3", "department_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_department."],
                ["4", "nurse_code", "Varchar(50)", "Unique, Not Null", "Internal hospital nursing staff badge number."],
                ["5", "registration_number", "Varchar(100)", "Unique, Not Null", "State Nursing Council professional registration number."],
                ["6", "assigned_ward", "Varchar(100)", "Null", "Current primary ward station assigned for duty."],
                ["7", "phone", "Varchar(20)", "Not Null", "Nursing personnel telephone number."]
            ]
        },

        # 11. tbl_admin
        {
            "name": "11.tbl_admin",
            "pk": "admin_id",
            "fk": "user_id references table tbl_user, hospital_id references table tbl_hospital",
            "rows": [
                ["1", "admin_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for hospital administrator."],
                ["2", "user_id", "Int(11)", "Foreign Key, Unique, Not Null", "References id of tbl_user."],
                ["3", "hospital_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_hospital."],
                ["4", "phone", "Varchar(20)", "Not Null", "Administrator official contact phone number."],
                ["5", "created_at", "Timestamp", "Default Current_Timestamp", "Administrative account creation timestamp."]
            ]
        },

        # 12. tbl_patient
        {
            "name": "12.tbl_patient",
            "pk": "patient_id",
            "fk": "user_id references table tbl_user, gender_id references table tbl_gender, blood_group_id references table tbl_blood_group",
            "rows": [
                ["1", "patient_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for patient records."],
                ["2", "user_id", "Int(11)", "Foreign Key, Unique, Not Null", "References id of tbl_user."],
                ["3", "date_of_birth", "Date", "Not Null", "Patient legal date of birth."],
                ["4", "gender_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_gender."],
                ["5", "blood_group_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_blood_group."],
                ["6", "address", "Text", "Not Null", "Patient residential home address."],
                ["7", "city", "Varchar(100)", "Not Null", "City of patient residence."],
                ["8", "state", "Varchar(100)", "Not Null", "State or province of residence."],
                ["9", "emergency_contact_name", "Varchar(200)", "Not Null", "Name of primary emergency contact person."],
                ["10", "emergency_contact_phone", "Varchar(20)", "Not Null", "Phone number for emergency contact."],
                ["11", "admission_status", "Varchar(50)", "Not Null", "Current care state (Active, Inpatient, Discharged)."]
            ]
        },

        # 13. tbl_doctor_availability
        {
            "name": "13.tbl_doctor_availability",
            "pk": "availability_id",
            "fk": "doctor_id references table tbl_doctor",
            "rows": [
                ["1", "availability_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for doctor roster slot."],
                ["2", "doctor_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_doctor."],
                ["3", "date", "Date", "Not Null", "Scheduled clinical working date."],
                ["4", "status", "Varchar(50)", "Not Null", "Availability state (AVAILABLE, ON_LEAVE, BUSY)."],
                ["5", "start_time", "Varchar(10)", "Not Null", "Starting time for patient consultations (e.g., 09:00)."],
                ["6", "end_time", "Varchar(10)", "Not Null", "Ending time for patient consultations (e.g., 17:00)."],
                ["7", "reason", "Varchar(255)", "Null", "Documented reason if doctor is on leave or unavailable."]
            ]
        },

        # 14. tbl_appointment_status
        {
            "name": "14.tbl_appointment_status",
            "pk": "status_id",
            "fk": "Nil",
            "rows": [
                ["1", "status_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for appointment status."],
                ["2", "name", "Varchar(50)", "Unique, Not Null", "Status label (scheduled, completed, cancelled, no_show)."]
            ]
        },

        # 15. tbl_appointment
        {
            "name": "15.tbl_appointment",
            "pk": "appointment_id",
            "fk": "patient_id references table tbl_patient, doctor_id references table tbl_doctor, status_id references table tbl_appointment_status",
            "rows": [
                ["1", "appointment_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for patient appointment."],
                ["2", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["3", "doctor_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_doctor."],
                ["4", "appointment_date", "Date", "Not Null", "Calendar date of scheduled clinical visit."],
                ["5", "appointment_time", "Time", "Not Null", "Time of scheduled appointment consultation."],
                ["6", "status_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_appointment_status."],
                ["7", "reason", "Text", "Not Null", "Chief medical reason or symptoms for scheduling visit."],
                ["8", "notes", "Text", "Null", "Doctor's clinical findings and consultation remarks."]
            ]
        },

        # 16. tbl_medicine
        {
            "name": "16.tbl_medicine",
            "pk": "medicine_id",
            "fk": "Nil",
            "rows": [
                ["1", "medicine_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for pharmaceutical drug."],
                ["2", "name", "Varchar(255)", "Not Null", "Trade/brand name of the medication."],
                ["3", "generic_name", "Varchar(255)", "Null", "Standard chemical or generic medical salt name."],
                ["4", "category", "Varchar(100)", "Not Null", "Therapeutic category (Antibiotic, Analgesic, etc.)."],
                ["5", "unit", "Varchar(50)", "Not Null", "Dosage form unit (Tablet, Capsule, Syrup, mg, ml)."],
                ["6", "description", "Text", "Null", "Clinical indications and pharmacology details."]
            ]
        },

        # 17. tbl_prescription
        {
            "name": "17.tbl_prescription",
            "pk": "prescription_id",
            "fk": "patient_id references table tbl_patient, doctor_id references table tbl_doctor, appointment_id references table tbl_appointment",
            "rows": [
                ["1", "prescription_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for clinical prescription."],
                ["2", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["3", "doctor_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_doctor."],
                ["4", "appointment_id", "Int(11)", "Foreign Key, Null", "References id of tbl_appointment."],
                ["5", "diagnosis", "Text", "Not Null", "Confirmed clinical diagnosis reached by physician."],
                ["6", "notes", "Text", "Null", "Dietary and lifestyle advice given by doctor."],
                ["7", "prescribed_date", "Date", "Not Null", "Date when the prescription was generated."],
                ["8", "valid_until", "Date", "Null", "Expiration date of the medical prescription."]
            ]
        },

        # 18. tbl_prescription_item
        {
            "name": "18.tbl_prescription_item",
            "pk": "item_id",
            "fk": "prescription_id references table tbl_prescription, medicine_id references table tbl_medicine",
            "rows": [
                ["1", "item_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for prescription line item."],
                ["2", "prescription_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_prescription."],
                ["3", "medicine_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_medicine."],
                ["4", "dosage", "Varchar(100)", "Not Null", "Dosage amount (e.g., 500mg, 1 tablet)."],
                ["5", "frequency", "Varchar(100)", "Not Null", "Frequency instructions (e.g., Morning and Night, 1-0-1)."],
                ["6", "duration_days", "Int(11)", "Not Null", "Duration of medical course in days."],
                ["7", "instructions", "Text", "Null", "Intake instructions (e.g., Take after food)."]
            ]
        },

        # 19. tbl_record_type
        {
            "name": "19.tbl_record_type",
            "pk": "record_type_id",
            "fk": "Nil",
            "rows": [
                ["1", "record_type_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for medical record type."],
                ["2", "name", "Varchar(100)", "Unique, Not Null", "Classification (consultation, lab_result, surgery, radiology)."]
            ]
        },

        # 20. tbl_medical_record
        {
            "name": "20.tbl_medical_record",
            "pk": "record_id",
            "fk": "patient_id references table tbl_patient, doctor_id references table tbl_doctor, appointment_id references table tbl_appointment, record_type_id references table tbl_record_type",
            "rows": [
                ["1", "record_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for clinical medical record."],
                ["2", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["3", "doctor_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_doctor."],
                ["4", "appointment_id", "Int(11)", "Foreign Key, Null", "References id of tbl_appointment."],
                ["5", "record_type_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_record_type."],
                ["6", "title", "Varchar(255)", "Not Null", "Title or brief summary of the medical examination."],
                ["7", "description", "Text", "Not Null", "Comprehensive clinical assessment notes."],
                ["8", "record_date", "Date", "Not Null", "Date examination or medical checkup occurred."]
            ]
        },

        # 21. tbl_document_type
        {
            "name": "21.tbl_document_type",
            "pk": "document_type_id",
            "fk": "Nil",
            "rows": [
                ["1", "document_type_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for medical document type."],
                ["2", "name", "Varchar(100)", "Unique, Not Null", "Document format (X-Ray, MRI, Lab Report, ECG, Prescription_PDF)."]
            ]
        },

        # 22. tbl_medical_document
        {
            "name": "22.tbl_medical_document",
            "pk": "document_id",
            "fk": "patient_id references table tbl_patient, record_id references table tbl_medical_record, document_type_id references table tbl_document_type, uploaded_by_id references table tbl_user",
            "rows": [
                ["1", "document_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for uploaded diagnostic document."],
                ["2", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["3", "record_id", "Int(11)", "Foreign Key, Null", "References id of tbl_medical_record."],
                ["4", "document_type_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_document_type."],
                ["5", "file_name", "Varchar(255)", "Not Null", "Original name of the stored document file."],
                ["6", "file_path", "Text", "Not Null", "Secure cloud storage URL or filesystem path."],
                ["7", "file_size_kb", "Int(11)", "Not Null", "Size of file in kilobytes."],
                ["8", "uploaded_by_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_user who performed upload."],
                ["9", "uploaded_at", "Timestamp", "Default Current_Timestamp", "Timestamp when file was uploaded."]
            ]
        },

        # 23. tbl_ward
        {
            "name": "23.tbl_ward",
            "pk": "ward_id",
            "fk": "Nil",
            "rows": [
                ["1", "ward_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for hospital inpatient ward."],
                ["2", "ward_number", "Varchar(50)", "Unique, Not Null", "Distinct clinical ward code (e.g., WARD-GEN-A, ICU-01)."],
                ["3", "name", "Varchar(150)", "Not Null", "Descriptive ward name (e.g., General Ward, Post-Op Care)."],
                ["4", "department", "Varchar(150)", "Null", "Hospital department responsible for the ward."],
                ["5", "total_beds", "Int(11)", "Not Null", "Total bed capacity available in this ward."],
                ["6", "is_active", "Boolean", "Default True", "Operational availability of the ward."]
            ]
        },

        # 24. tbl_bed
        {
            "name": "24.tbl_bed",
            "pk": "bed_id",
            "fk": "ward_id references table tbl_ward",
            "rows": [
                ["1", "bed_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for hospital bed."],
                ["2", "ward_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_ward."],
                ["3", "bed_number", "Varchar(50)", "Not Null", "Physical bed identifier number (e.g., B-101, ICU-04)."],
                ["4", "status", "Varchar(50)", "Not Null", "Bed occupancy status (AVAILABLE, OCCUPIED, MAINTENANCE)."]
            ]
        },

        # 25. tbl_inpatient_admission
        {
            "name": "25.tbl_inpatient_admission",
            "pk": "admission_id",
            "fk": "patient_id references table tbl_patient, admitting_doctor_id references table tbl_doctor, ward_id references table tbl_ward, bed_id references table tbl_bed",
            "rows": [
                ["1", "admission_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for patient hospital admission."],
                ["2", "admission_number", "Varchar(50)", "Unique, Not Null", "Official inpatient admission tracking number."],
                ["3", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["4", "admitting_doctor_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_doctor who admitted patient."],
                ["5", "ward_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_ward."],
                ["6", "bed_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_bed assigned to patient."],
                ["7", "admission_date_time", "Timestamp", "Default Current_Timestamp", "Date and time of inpatient admission."],
                ["8", "admission_diagnosis", "Varchar(255)", "Not Null", "Provisional clinical diagnosis requiring hospitalization."],
                ["9", "chief_complaint", "Text", "Not Null", "Symptoms presented at the time of admission."],
                ["10", "admission_status", "Varchar(50)", "Not Null", "Status (ADMITTED, TRANSFERRED, DISCHARGED)."],
                ["11", "acuity_level", "Varchar(50)", "Not Null", "Patient severity level (CRITICAL, MODERATE, STABLE)."],
                ["12", "discharge_date", "Timestamp", "Null", "Timestamp of formal patient discharge from hospital."]
            ]
        },

        # 26. tbl_bed_transfer_history
        {
            "name": "26.tbl_bed_transfer_history",
            "pk": "transfer_id",
            "fk": "admission_id references table tbl_inpatient_admission, from_ward_id references table tbl_ward, from_bed_id references table tbl_bed, to_ward_id references table tbl_ward, to_bed_id references table tbl_bed, transferred_by_id references table tbl_user",
            "rows": [
                ["1", "transfer_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for bed transfer log."],
                ["2", "admission_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_inpatient_admission."],
                ["3", "from_ward_id", "Int(11)", "Foreign Key, Not Null", "References id of source tbl_ward."],
                ["4", "from_bed_id", "Int(11)", "Foreign Key, Not Null", "References id of source tbl_bed."],
                ["5", "to_ward_id", "Int(11)", "Foreign Key, Not Null", "References id of destination tbl_ward."],
                ["6", "to_bed_id", "Int(11)", "Foreign Key, Not Null", "References id of destination tbl_bed."],
                ["7", "transfer_reason", "Varchar(255)", "Null", "Clinical or operational reason for bed movement."],
                ["8", "transferred_by_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_user authorizing transfer."],
                ["9", "transferred_at", "Timestamp", "Default Current_Timestamp", "Exact timestamp when patient transfer occurred."]
            ]
        },

        # 27. tbl_patient_observation
        {
            "name": "27.tbl_patient_observation",
            "pk": "observation_id",
            "fk": "patient_id references table tbl_patient, nurse_id references table tbl_nurse",
            "rows": [
                ["1", "observation_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for patient observation entry."],
                ["2", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["3", "nurse_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_nurse who recorded vitals."],
                ["4", "observation_date", "Date", "Not Null", "Date when vitals check was performed."],
                ["5", "observation_time", "Time", "Not Null", "Time when observation was conducted."],
                ["6", "temperature", "Decimal(5,2)", "Not Null", "Body temperature measured in Fahrenheit / Celsius."],
                ["7", "pulse_rate", "Int(11)", "Not Null", "Pulse / heart rate in beats per minute (BPM)."],
                ["8", "respiratory_rate", "Int(11)", "Not Null", "Respiratory rate in breaths per minute."],
                ["9", "systolic_bp", "Int(11)", "Not Null", "Systolic arterial blood pressure in mmHg."],
                ["10", "diastolic_bp", "Int(11)", "Not Null", "Diastolic arterial blood pressure in mmHg."],
                ["11", "spo2", "Decimal(5,2)", "Not Null", "Peripheral blood oxygen saturation (%)."],
                ["12", "blood_glucose", "Decimal(7,2)", "Null", "Blood glucose level in mg/dL."],
                ["13", "weight", "Decimal(6,2)", "Null", "Patient weight in kilograms."],
                ["14", "pain_score", "Int(11)", "Null", "Standard clinical pain scale score (0 to 10)."],
                ["15", "consciousness_level", "Varchar(50)", "Not Null", "Consciousness status (Alert, Confused, Drowsy, Unresponsive)."],
                ["16", "general_observation", "Text", "Null", "Nursing notes on patient physical condition and demeanor."]
            ]
        },

        # 28. tbl_discharge_summary
        {
            "name": "28.tbl_discharge_summary",
            "pk": "summary_id",
            "fk": "patient_id references table tbl_patient, doctor_id references table tbl_doctor",
            "rows": [
                ["1", "summary_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for patient discharge summary."],
                ["2", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["3", "doctor_id", "Int(11)", "Foreign Key, Not Null", "References id of attending doctor."],
                ["4", "admission_date", "Date", "Not Null", "Date when patient was originally admitted."],
                ["5", "discharge_date", "Date", "Not Null", "Date of official hospital discharge."],
                ["6", "admission_diagnosis", "Varchar(255)", "Null", "Initial provisional admitting diagnosis."],
                ["7", "discharge_diagnosis", "Varchar(255)", "Not Null", "Final confirmed diagnosis upon medical discharge."],
                ["8", "clinical_course", "Text", "Not Null", "Summary of patient clinical course and interventions."],
                ["9", "condition_at_discharge", "Varchar(100)", "Not Null", "Physical state at release (Improved, Cured, Stable)."],
                ["10", "follow_up_instructions", "Text", "Null", "Post-discharge clinical and medication instructions."],
                ["11", "follow_up_date", "Date", "Null", "Recommended date for outpatient review visit."],
                ["12", "summary_status", "Varchar(50)", "Not Null", "Summary status (DRAFT, FINALIZED)."]
            ]
        },

        # 29. tbl_nursing_patient_summary
        {
            "name": "29.tbl_nursing_patient_summary",
            "pk": "summary_id",
            "fk": "patient_id references table tbl_patient, nurse_id references table tbl_nurse",
            "rows": [
                ["1", "summary_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for nursing shift handover report."],
                ["2", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["3", "nurse_id", "Int(11)", "Foreign Key, Not Null", "References id of authoring nurse."],
                ["4", "summary_date", "Date", "Not Null", "Calendar date of nursing shift handover."],
                ["5", "patient_current_condition", "Varchar(255)", "Not Null", "Current physical condition assessment."],
                ["6", "level_of_consciousness", "Varchar(50)", "Null", "Level of alertness and mental status."],
                ["7", "vital_signs_summary", "Text", "Null", "Aggregated vital signs summary recorded during shift."],
                ["8", "nursing_care_provided", "Text", "Null", "Dressings, medication administration, and care delivered."],
                ["9", "status", "Varchar(50)", "Not Null", "Report state (DRAFT, FINALIZED)."]
            ]
        },

        # 30. tbl_reminder_status
        {
            "name": "30.tbl_reminder_status",
            "pk": "status_id",
            "fk": "Nil",
            "rows": [
                ["1", "status_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for medication reminder status."],
                ["2", "name", "Varchar(50)", "Unique, Not Null", "Status designation (ACTIVE, TAKEN, MISSED, CANCELLED)."]
            ]
        },

        # 31. tbl_medicine_reminder
        {
            "name": "31.tbl_medicine_reminder",
            "pk": "reminder_id",
            "fk": "patient_id references table tbl_patient, medicine_id references table tbl_medicine, status_id references table tbl_reminder_status",
            "rows": [
                ["1", "reminder_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for medication reminder."],
                ["2", "patient_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_patient."],
                ["3", "medicine_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_medicine."],
                ["4", "reminder_time", "Time", "Not Null", "Daily scheduled alert time for medication intake."],
                ["5", "frequency", "Varchar(100)", "Not Null", "Intake frequency (Once daily, Twice daily, Every 8 hours)."],
                ["6", "start_date", "Date", "Not Null", "Start date for drug schedule alerts."],
                ["7", "end_date", "Date", "Null", "End date for drug regimen."],
                ["8", "status_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_reminder_status."]
            ]
        },

        # 32. tbl_notification_type
        {
            "name": "32.tbl_notification_type",
            "pk": "notification_type_id",
            "fk": "Nil",
            "rows": [
                ["1", "notification_type_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for notification category."],
                ["2", "name", "Varchar(100)", "Unique, Not Null", "Notification category (APPOINTMENT, PRESCRIPTION, REMINDER, SYSTEM)."]
            ]
        },

        # 33. tbl_notification
        {
            "name": "33.tbl_notification",
            "pk": "notification_id",
            "fk": "user_id references table tbl_user, notification_type_id references table tbl_notification_type",
            "rows": [
                ["1", "notification_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for system user notification."],
                ["2", "user_id", "Int(11)", "Foreign Key, Not Null", "References id of recipient tbl_user."],
                ["3", "notification_type_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_notification_type."],
                ["4", "title", "Varchar(255)", "Not Null", "Subject title of the alert message."],
                ["5", "message", "Text", "Not Null", "Full textual body of the notification message."],
                ["6", "is_read", "Boolean", "Default False", "Read receipt status flag (True if read)."],
                ["7", "created_at", "Timestamp", "Default Current_Timestamp", "Timestamp when notification was generated."]
            ]
        },

        # 34. tbl_hospital_procedure
        {
            "name": "34.tbl_hospital_procedure",
            "pk": "procedure_id",
            "fk": "hospital_id references table tbl_hospital, department_id references table tbl_department",
            "rows": [
                ["1", "procedure_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for hospital SOP / procedure."],
                ["2", "hospital_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_hospital."],
                ["3", "department_id", "Int(11)", "Foreign Key, Null", "References id of tbl_department."],
                ["4", "title", "Varchar(255)", "Not Null", "Standard clinical procedure title."],
                ["5", "procedure_code", "Varchar(50)", "Unique, Not Null", "Hospital protocol code (e.g., SOP-CARD-01)."],
                ["6", "category", "Varchar(100)", "Not Null", "Procedure category (Emergency, Infection Control, Surgical)."],
                ["7", "version", "Varchar(50)", "Not Null", "Protocol document version (e.g., 1.0, 2.0)."],
                ["8", "status", "Varchar(50)", "Not Null", "Status (PUBLISHED, DRAFT, UNDER_REVIEW)."],
                ["9", "effective_date", "Date", "Not Null", "Effective implementation date for protocol."]
            ]
        },

        # 35. tbl_action_type
        {
            "name": "35.tbl_action_type",
            "pk": "action_type_id",
            "fk": "Nil",
            "rows": [
                ["1", "action_type_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for audit action type."],
                ["2", "name", "Varchar(50)", "Unique, Not Null", "System audit action verb (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT)."]
            ]
        },

        # 36. tbl_audit_log
        {
            "name": "36.tbl_audit_log",
            "pk": "audit_id",
            "fk": "user_id references table tbl_user, action_type_id references table tbl_action_type",
            "rows": [
                ["1", "audit_id", "Int(11)", "Primary Key, Auto_increment", "Unique identifier for system audit log."],
                ["2", "user_id", "Int(11)", "Foreign Key, Null", "References id of tbl_user who performed operation."],
                ["3", "action_type_id", "Int(11)", "Foreign Key, Not Null", "References id of tbl_action_type."],
                ["4", "table_name", "Varchar(100)", "Not Null", "Database entity table affected by the action."],
                ["5", "record_id", "Int(11)", "Null", "Specific row ID altered in the target table."],
                ["6", "ip_address", "Varchar(45)", "Null", "Network client IP address of requester."],
                ["7", "created_at", "Timestamp", "Default Current_Timestamp", "Timestamp when audit event occurred."]
            ]
        }
    ]

    elements = []

    # Chapter / Section Header matching user's image: "4.5 TABLE DESIGN"
    elements.append(Paragraph("4.5 TABLE DESIGN", title_style))
    elements.append(Spacer(1, 4))

    # Total width: A4 width (595.27) - 2 * 40 margin = 515.27 pt
    # Col Widths: No: 32, Field name: 105, Datatype (Size): 95, Key Constraints: 115, Description: 168.27 => Total = 515.27
    col_widths = [32, 105, 95, 115, 168.27]

    for item in tables_data:
        tbl_elements = []

        # Table Heading: "1.tbl_login"
        tbl_elements.append(Paragraph(item["name"], tbl_title_style))

        # Primary Key Line
        pk_text = f"Primary key: <b>{item['pk']}</b>"
        tbl_elements.append(Paragraph(pk_text, meta_style))

        # Foreign Key Line
        fk_text = f"Foreign key: {item['fk']}"
        tbl_elements.append(Paragraph(fk_text, meta_style))
        tbl_elements.append(Spacer(1, 4))

        # Build Table Data
        header_row = [
            Paragraph("No:", col_header_style),
            Paragraph("Field name", col_header_style),
            Paragraph("Datatype (Size)", col_header_style),
            Paragraph("Key Constraints", col_header_style),
            Paragraph("Description of the field", col_header_style)
        ]

        table_rows = [header_row]
        for row in item["rows"]:
            table_rows.append([
                Paragraph(row[0], cell_center),
                Paragraph(row[1], cell_center),
                Paragraph(row[2], cell_center),
                Paragraph(row[3], cell_left),
                Paragraph(row[4], cell_left)
            ])

        t = Table(table_rows, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.75, colors.black),
            ('BOX', (0, 0), (-1, -1), 1.0, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8F9FA")),
        ]))

        tbl_elements.append(t)
        tbl_elements.append(Spacer(1, 14))

        # For tables with <= 8 rows, keep together so they don't awkwardly split
        if len(item["rows"]) <= 8:
            elements.append(KeepTogether(tbl_elements))
        else:
            # Let longer tables flow naturally across page breaks if needed
            elements.extend(tbl_elements)

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"Successfully generated database design PDF at: {output_pdf_path}")

if __name__ == "__main__":
    output_path = os.path.abspath(r"d:\SEM 2\A.I\MediTwin\MediTwin_Table_Design.pdf")
    build_pdf(output_path)
