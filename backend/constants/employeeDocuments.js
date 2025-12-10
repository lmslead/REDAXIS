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
  {
    key: 'pan_card_document',
    label: 'PAN Card Proof',
    description: 'Government-approved PAN card copy uploaded by the employee',
    allowSelfUpload: true,
  },
  {
    key: 'aadhar_card_document',
    label: 'Aadhar Card Proof',
    description: 'Official Aadhar card copy uploaded by the employee',
    allowSelfUpload: true,
  },
];

export const EMPLOYEE_DOCUMENT_TYPE_VALUES = EMPLOYEE_DOCUMENT_TYPES.map((item) => item.key);

export const EMPLOYEE_DOCUMENT_FOLDER = process.env.EMPLOYEE_DOCUMENT_FOLDER || '';
