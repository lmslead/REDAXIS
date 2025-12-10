# Payslip Storage Guide

The payslip controller now writes compressed PDFs directly to the Hostinger VPS so nothing ever leaves the `REDAXIS` folder.

## Folder layout

```
REDAXIS/
├── backend/
├── public/
├── src/
└── payslips/
	└── RG0123/
		├── 2024_12/*.pdf.gz         ← monthly payslips
		├── offer_letter/*.pdf.gz    ← L3 uploads
		├── pan_card_document/*.pdf.gz
		└── aadhar_card_document/*.pdf.gz
```

If the `payslips` directory does not exist yet, create it once (from the root of the deployment):

```bash
mkdir -p ~/REDAXIS/payslips
chmod 770 ~/REDAXIS/payslips
```

The server resolves the folder from `PAYSLIP_STORAGE_PATH` in `backend/.env`. By default it points to `../payslips`, which resolves to the sibling folder shown above when the backend runs from `REDAXIS/backend`.

## Employment documents

Offer/appointment/confirmation/relieving/experience letters plus Aadhaar/PAN proofs now live directly inside each employee’s payslip directory: `payslips/<EMPLOYEE_ID>/<docType>/`. Each upload is still compressed (`.pdf.gz`). If you prefer isolating them under a separate sub-folder, set `EMPLOYEE_DOCUMENT_FOLDER` in `backend/.env` (leave it blank to keep sharing the payslip folder).

## Compression workflow

1. Finance uploads a `.pdf`.
2. The backend gzips the payload (lossless) before persisting to disk with a `.gz` suffix.
3. When someone downloads/view the payslip the server transparently decompresses it and streams the original PDF.

Metadata in MongoDB tracks both the original file size and the compressed size; older, uncompressed records continue to download normally.

## Access control

Only L3 users mapped to a Finance department (configurable via `FINANCE_DEPARTMENT_NAMES` in `.env`) plus any L4 admins can upload/replace payslips. The API rejects every other department, and the React UI hides upload/replace buttons for them as well.

## Environment variables

```
PAYSLIP_STORAGE_PATH=../payslips
FINANCE_DEPARTMENT_NAMES=Finance
EMPLOYEE_DOCUMENT_FOLDER=
```

Override `PAYSLIP_STORAGE_PATH` if you relocate the storage folder, and extend `FINANCE_DEPARTMENT_NAMES` with comma-separated aliases if Finance uses multiple department names.
`EMPLOYEE_DOCUMENT_FOLDER` is optional; leave it empty to save documents alongside payslips per employee, or set a name (for example `employee-documents`) if you want everything under a dedicated sub-folder.
