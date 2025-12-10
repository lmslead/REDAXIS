export const EMPLOYEE_DOCUMENT_TYPES = [
  {
    key: 'offer_letter',
    label: 'Offer Letter',
    description: 'Signed offer letter issued during hiring',
  },
  {
    key: 'appointment_letter',
    label: 'Appointment Letter',
    description: 'Formal appointment letter confirming employment',
  },
  {
    key: 'confirmation_letter',
    label: 'Confirmation Letter',
    description: 'Confirmation issued after successful probation',
  },
  {
    key: 'relieving_letter',
    label: 'Relieving Letter',
    description: 'Exit letter shared when employee leaves the company',
  },
  {
    key: 'experience_letter',
    label: 'Experience Letter',
    description: 'Experience certificate handed over on exit',
  },
];

export const EMPLOYEE_DOCUMENT_TYPE_VALUES = EMPLOYEE_DOCUMENT_TYPES.map((item) => item.key);

export const EMPLOYEE_DOCUMENT_FOLDER = process.env.EMPLOYEE_DOCUMENT_FOLDER || 'employee-documents';
