import { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { authAPI, employeeDocumentsAPI } from '../services/api';
import './Profile.css';

// Helper function to create cropped image from canvas
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
};

const createEmptyAddress = () => ({
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
});

const createEmptyBankDetails = () => ({
  accountNumber: '',
  bankName: '',
  ifscCode: '',
});

const createEmptyComplianceDetails = () => ({
  uanNumber: '',
  pfNumber: '',
  esiNumber: '',
});

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const profileImageInputRef = useRef(null);
  
  // Image cropping state
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    personalEmail: '',
    dateOfBirth: '',
    currentAddress: createEmptyAddress(),
    permanentAddress: createEmptyAddress(),
    panCard: '',
    aadharCard: '',
    bankDetails: createEmptyBankDetails(),
    complianceDetails: createEmptyComplianceDetails(),
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [documentRecords, setDocumentRecords] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [docUploadError, setDocUploadError] = useState('');
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const fileInputRefs = useRef({});

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedFieldChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  useEffect(() => {
    fetchUserProfile();
    fetchEmploymentDocuments();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      const fallbackCurrentAddress = response.data.currentAddress || response.data.address || createEmptyAddress();
      const fallbackPermanentAddress = response.data.permanentAddress || response.data.currentAddress || response.data.address || createEmptyAddress();
      setFormData({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        phone: response.data.phone || '',
        personalEmail: response.data.personalEmail || '',
        dateOfBirth: response.data.dateOfBirth ? new Date(response.data.dateOfBirth).toISOString().split('T')[0] : '',
        currentAddress: { ...fallbackCurrentAddress },
        permanentAddress: { ...fallbackPermanentAddress },
        panCard: response.data.panCard || '',
        aadharCard: response.data.aadharCard || '',
        bankDetails: { ...(response.data.bankDetails || createEmptyBankDetails()) },
        complianceDetails: { ...(response.data.complianceDetails || createEmptyComplianceDetails()) },
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmploymentDocuments = async () => {
    setDocumentsLoading(true);
    setDocumentsError('');
    try {
      const response = await employeeDocumentsAPI.getAll();
      setDocumentRecords(response.data || []);
      setDocumentTypes(response.docTypes || []);
    } catch (error) {
      console.error('Error fetching employment documents:', error);
      setDocumentsError(error.message || 'Unable to load employment documents');
      setDocumentRecords([]);
      setDocumentTypes([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        phone: formData.phone,
        personalEmail: formData.personalEmail,
        dateOfBirth: formData.dateOfBirth || null,
        panCard: formData.panCard,
        aadharCard: formData.aadharCard,
        currentAddress: formData.currentAddress,
        permanentAddress: formData.permanentAddress,
        bankDetails: formData.bankDetails,
        complianceDetails: formData.complianceDetails,
      };
      await authAPI.updateProfile(payload);
      alert('Profile updated successfully!');
      setEditMode(false);
      fetchUserProfile();
    } catch (error) {
      alert(error.message || 'Update failed');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      alert('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      alert(error.message || 'Password change failed');
    }
  };

  const handleDownloadDocument = async (record) => {
    try {
      const blob = await employeeDocumentsAPI.download(record._id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = record.fileName || `${record.docType}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'Failed to download document');
    }
  };

  const handleProfileImageClick = () => {
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = '';
      profileImageInputRef.current.click();
    }
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) {
      alert('Please select a valid image file (PNG, JPG, GIF, or WEBP)');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      event.target.value = '';
      return;
    }

    // Create a URL for the selected image and show crop modal
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropModal(true);
    event.target.value = '';
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    setCroppedAreaPixels(null);
  };

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setUploadingImage(true);
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });
      
      const response = await authAPI.uploadProfileImage(croppedFile);
      if (response.data) {
        setUser(response.data);
      }
      alert('Profile image updated successfully!');
      setShowCropModal(false);
      setImageToCrop(null);
    } catch (error) {
      alert(error.message || 'Failed to upload profile image');
    } finally {
      setUploadingImage(false);
    }
  };

  const triggerDocumentUpload = (docType) => {
    setDocUploadError('');
    const inputRef = fileInputRefs.current[docType];
    if (inputRef) {
      inputRef.value = '';
      inputRef.click();
    }
  };

  const handleDocumentFileChange = async (docType, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      setDocUploadError('Only PDF files are allowed');
      event.target.value = '';
      return;
    }

    if (!user?._id) {
      setDocUploadError('User session expired. Please re-login.');
      event.target.value = '';
      return;
    }

    setUploadingDocType(docType);
    setDocUploadError('');
    try {
      await employeeDocumentsAPI.upload({
        employeeId: user._id,
        docType,
        file,
      });
      alert('Document uploaded successfully!');
      await fetchEmploymentDocuments();
    } catch (error) {
      setDocUploadError(error.message || 'Failed to upload document');
    } finally {
      setUploadingDocType(null);
      event.target.value = '';
    }
  };

  const selfUploadDocumentTypes = documentTypes.filter((type) => type.allowSelfUpload);
  const sharedDocumentTypes = documentTypes.filter((type) => !type.allowSelfUpload);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">My Profile</h2>
          <p className="text-muted">Manage your personal information</p>
        </div>
        <div className="col-auto">
          {!editMode ? (
            <button className="btn btn-primary" onClick={() => setEditMode(true)}>
              <i className="bi bi-pencil me-2"></i>Edit Profile
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => { setEditMode(false); fetchUserProfile(); }}>
              <i className="bi bi-x-circle me-2"></i>Cancel
            </button>
          )}
        </div>
      </div>

      <div className="row">
        {/* Profile Card */}
        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              {/* Hidden file input for profile image */}
              <input
                type="file"
                ref={profileImageInputRef}
                onChange={handleProfileImageChange}
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                style={{ display: 'none' }}
              />
              
              {/* Profile Image with Upload Overlay */}
              <div 
                className="profile-image-container mx-auto mb-3"
                onClick={handleProfileImageClick}
                style={{ 
                  position: 'relative', 
                  width: '120px', 
                  height: '120px',
                  cursor: 'pointer'
                }}
                title="Click to change profile picture"
              >
                <img
                  src={user?.profileImage || '/assets/client.jpg'}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    objectFit: 'cover',
                    border: '3px solid #e2e8f0'
                  }}
                />
                
                {/* Upload Overlay */}
                <div 
                  className="profile-image-overlay"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    top: 0,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  {uploadingImage ? (
                    <span className="spinner-border spinner-border-sm text-white" role="status">
                      <span className="visually-hidden">Uploading...</span>
                    </span>
                  ) : (
                    <i className="bi bi-camera-fill text-white fs-4"></i>
                  )}
                </div>
              </div>
              
              <h5 className="fw-bold mb-1">{user?.firstName} {user?.lastName}</h5>
              <p className="text-muted mb-2">{user?.position || 'Employee'}</p>
              <span className={`badge ${
                user?.managementLevel === 4 ? 'bg-dark' :
                user?.managementLevel === 3 ? 'bg-danger' :
                user?.managementLevel === 2 ? 'bg-warning' :
                user?.managementLevel === 1 ? 'bg-info' : 'bg-primary'
              } mb-3`}>
                LEVEL {user?.managementLevel || 0} - {
                  user?.managementLevel === 4 ? 'CEO/OWNER' :
                  user?.managementLevel === 3 ? 'ADMIN' :
                  user?.managementLevel === 2 ? 'SR. MANAGER' :
                  user?.managementLevel === 1 ? 'MANAGER' : 'EMPLOYEE'
                }
              </span>
              
              <div className="d-grid gap-2 mt-4">
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <i className="bi bi-key me-2"></i>Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Quick Info</h6>
              <div className="mb-3">
                <small className="text-muted d-block">Employee ID</small>
                <strong>{user?.employeeId}</strong>
              </div>
              <div className="mb-3">
                <small className="text-muted d-block">Department</small>
                <strong>{user?.department?.name || 'N/A'}</strong>
              </div>
              <div className="mb-3">
                <small className="text-muted d-block">Joining Date</small>
                <strong>{user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : 'N/A'}</strong>
              </div>
              <div className="mb-3">
                <small className="text-muted d-block">Employment Type</small>
                <span className={`badge ${
                  user?.employmentType === 'full-time' ? 'bg-success' :
                  user?.employmentType === 'probation' ? 'bg-warning text-dark' :
                  user?.employmentType === 'internship' ? 'bg-info text-dark' : 'bg-secondary'
                }`} style={{ textTransform: 'capitalize' }}>
                  {user?.employmentType?.replace('-', ' ') || 'Full Time'}
                </span>
              </div>
              <div>
                <small className="text-muted d-block">Status</small>
                <span className={`badge ${
                  user?.status === 'active' ? 'bg-success' :
                  user?.status === 'on-leave' ? 'bg-warning' : 'bg-secondary'
                }`}>
                  {user?.status}
                </span>
              </div>
            </div>
          </div>

          {(sharedDocumentTypes.length > 0 || documentsLoading || documentsError) && (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-body profile-documents-card">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">Employment Letters</h6>
                  {documentsLoading && (
                    <span className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </span>
                  )}
                </div>
                {documentsError && (
                  <div className="alert alert-warning py-2">{documentsError}</div>
                )}
                {!documentsError && (
                  <div className="profile-document-list">
                    {sharedDocumentTypes.length === 0 && !documentsLoading && (
                      <p className="text-muted small mb-0">No employment letter types configured yet.</p>
                    )}
                    {sharedDocumentTypes.map((type) => {
                      // For types that allow multiple, get all records; otherwise get single record
                      const records = type.allowMultiple 
                        ? documentRecords.filter((doc) => doc.docType === type.key)
                        : [];
                      const singleRecord = !type.allowMultiple 
                        ? documentRecords.find((doc) => doc.docType === type.key)
                        : null;
                      
                      // Render multiple documents for allowMultiple types
                      if (type.allowMultiple) {
                        return (
                          <div key={type.key}>
                            <div className={`profile-document-row ${records.length > 0 ? 'ready' : 'pending'}`}>
                              <div>
                                <div className="profile-document-title">{type.label}</div>
                                <small className="text-muted">
                                  {records.length > 0 
                                    ? `${records.length} document${records.length > 1 ? 's' : ''} uploaded`
                                    : type.description}
                                </small>
                              </div>
                              {records.length === 0 && (
                                <span className="badge bg-secondary">Pending</span>
                              )}
                            </div>
                            {records.length > 0 && (
                              <div className="ms-3 mb-2">
                                {records.map((record, idx) => {
                                  const uploadedDate = record?.uploadedAt ? new Date(record.uploadedAt) : null;
                                  return (
                                    <div 
                                      key={record._id} 
                                      className="d-flex justify-content-between align-items-center py-2 border-bottom"
                                      style={{ fontSize: '0.85rem' }}
                                    >
                                      <span className="text-muted">
                                        <i className="bi bi-file-earmark-pdf me-1"></i>
                                        {uploadedDate ? uploadedDate.toLocaleDateString() : `Document ${idx + 1}`}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => handleDownloadDocument(record)}
                                        style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
                                      >
                                        <i className="bi bi-eye me-1"></i>View
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Render single document for regular types
                      const uploadedDate = singleRecord?.uploadedAt ? new Date(singleRecord.uploadedAt) : null;
                      return (
                        <div
                          className={`profile-document-row ${singleRecord ? 'ready' : 'pending'}`}
                          key={type.key}
                        >
                          <div>
                            <div className="profile-document-title">{type.label}</div>
                            <small className="text-muted">
                              {singleRecord
                                ? `Updated on ${uploadedDate ? uploadedDate.toLocaleDateString() : 'N/A'}`
                                : type.description}
                            </small>
                          </div>
                          {singleRecord ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleDownloadDocument(singleRecord)}
                            >
                              <i className="bi bi-eye me-1"></i>View
                            </button>
                          ) : (
                            <span className="badge bg-secondary">Pending</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {selfUploadDocumentTypes.length > 0 && (
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-body profile-documents-card">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">Identity Documents</h6>
                  {documentsLoading && (
                    <span className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </span>
                  )}
                </div>
                {docUploadError && !documentsError && (
                  <div className="alert alert-danger py-2">{docUploadError}</div>
                )}
                {documentsError && (
                  <div className="alert alert-warning py-2 mb-0">{documentsError}</div>
                )}
                {!documentsError && (
                  <div className="profile-document-list">
                    {selfUploadDocumentTypes.map((type) => {
                      const record = documentRecords.find((doc) => doc.docType === type.key);
                      const uploadedDate = record?.uploadedAt ? new Date(record.uploadedAt) : null;
                      const isUploading = uploadingDocType === type.key;
                      return (
                        <div
                          className={`profile-document-row ${record ? 'ready' : 'pending'}`}
                          key={type.key}
                        >
                          <div>
                            <div className="profile-document-title">{type.label}</div>
                            <small className="text-muted d-block">
                              {record
                                ? `Updated on ${uploadedDate ? uploadedDate.toLocaleDateString() : 'N/A'}`
                                : type.description}
                            </small>
                          </div>
                          <div className="d-flex gap-2 flex-wrap align-items-center">
                            {record && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleDownloadDocument(record)}
                              >
                                <i className="bi bi-eye me-1"></i>View
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => triggerDocumentUpload(type.key)}
                              disabled={isUploading}
                            >
                              {isUploading ? 'Uploading...' : record ? 'Replace PDF' : 'Upload PDF'}
                            </button>
                            <input
                              type="file"
                              accept="application/pdf"
                              style={{ display: 'none' }}
                              ref={(ref) => {
                                if (ref) {
                                  fileInputRefs.current[type.key] = ref;
                                } else {
                                  delete fileInputRefs.current[type.key];
                                }
                              }}
                              onChange={(event) => handleDocumentFileChange(type.key, event)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Details */}
        <div className="col-lg-8">
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="row g-3 profile-sections">
              {/* Personal Info */}
              <div className="col-12">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3 text-uppercase small text-muted">Personal Information</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">First Name</label>
                        <input type="text" className="form-control" value={formData.firstName} disabled />
                        <small className="text-muted">Contact HR to update name</small>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Last Name</label>
                        <input type="text" className="form-control" value={formData.lastName} disabled />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Work Email</label>
                        <input type="email" className="form-control" value={user?.email} disabled />
                        <small className="text-muted">Work email cannot be changed</small>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Personal Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.personalEmail}
                          onChange={(e) => handleFieldChange('personalEmail', e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={formData.phone}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Date of Birth</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.dateOfBirth}
                          onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Position</label>
                        <input type="text" className="form-control" value={user?.position || ''} disabled />
                        <small className="text-muted">Contact HR to update</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3 text-uppercase small text-muted">Identity Documents</h6>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">PAN Card</label>
                        <input
                          type="text"
                          className="form-control text-uppercase"
                          value={formData.panCard}
                          onChange={(e) => handleFieldChange('panCard', e.target.value.toUpperCase())}
                          disabled={!editMode}
                          maxLength="10"
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Aadhar Card</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.aadharCard}
                          onChange={(e) => handleFieldChange('aadharCard', e.target.value.replace(/\D/g, ''))}
                          disabled={!editMode}
                          maxLength="12"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Banking */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3 text-uppercase small text-muted">Banking Details</h6>
                    <div className="row g-3">
                      <div className="col-md-12">
                        <label className="form-label">Account Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.bankDetails.accountNumber}
                          onChange={(e) => handleNestedFieldChange('bankDetails', 'accountNumber', e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Bank Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.bankDetails.bankName}
                          onChange={(e) => handleNestedFieldChange('bankDetails', 'bankName', e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">IFSC Code</label>
                        <input
                          type="text"
                          className="form-control text-uppercase"
                          value={formData.bankDetails.ifscCode}
                          onChange={(e) => handleNestedFieldChange('bankDetails', 'ifscCode', e.target.value.toUpperCase())}
                          disabled={!editMode}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3 text-uppercase small text-muted">Compliance Details</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">UAN Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.complianceDetails.uanNumber}
                          onChange={(e) => handleNestedFieldChange('complianceDetails', 'uanNumber', e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">PF Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.complianceDetails.pfNumber}
                          onChange={(e) => handleNestedFieldChange('complianceDetails', 'pfNumber', e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">ESI Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.complianceDetails.esiNumber}
                          onChange={(e) => handleNestedFieldChange('complianceDetails', 'esiNumber', e.target.value)}
                          disabled={!editMode}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3 text-uppercase small text-muted">Salary Information</h6>
                    <label className="form-label">Gross Salary</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.salary?.grossSalary ? `₹${Number(user.salary.grossSalary).toLocaleString()}` : 'Not Set'}
                      disabled
                    />
                    <small className="text-muted">Managed by Finance</small>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="col-12">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3 text-uppercase small text-muted">Address Information</h6>
                    <div className="row g-3">
                      <div className="col-lg-6">
                        <div className="address-panel">
                          <span className="text-uppercase text-muted small d-block mb-2">Current Address</span>
                          <div className="mb-3">
                            <label className="form-label">Street</label>
                            <input
                              type="text"
                              className="form-control"
                              value={formData.currentAddress.street}
                              onChange={(e) => handleNestedFieldChange('currentAddress', 'street', e.target.value)}
                              disabled={!editMode}
                            />
                          </div>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label">City</label>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.currentAddress.city}
                                onChange={(e) => handleNestedFieldChange('currentAddress', 'city', e.target.value)}
                                disabled={!editMode}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">State</label>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.currentAddress.state}
                                onChange={(e) => handleNestedFieldChange('currentAddress', 'state', e.target.value)}
                                disabled={!editMode}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Zip Code</label>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.currentAddress.zipCode}
                                onChange={(e) => handleNestedFieldChange('currentAddress', 'zipCode', e.target.value)}
                                disabled={!editMode}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Country</label>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.currentAddress.country}
                                onChange={(e) => handleNestedFieldChange('currentAddress', 'country', e.target.value)}
                                disabled={!editMode}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="address-panel">
                          <span className="text-uppercase text-muted small d-block mb-2">Permanent Address</span>
                          <div className="mb-3">
                            <label className="form-label">Street</label>
                            <input
                              type="text"
                              className="form-control"
                              value={formData.permanentAddress.street}
                              onChange={(e) => handleNestedFieldChange('permanentAddress', 'street', e.target.value)}
                              disabled={!editMode}
                            />
                          </div>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label">City</label>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.permanentAddress.city}
                                onChange={(e) => handleNestedFieldChange('permanentAddress', 'city', e.target.value)}
                                disabled={!editMode}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">State</label>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.permanentAddress.state}
                                onChange={(e) => handleNestedFieldChange('permanentAddress', 'state', e.target.value)}
                                disabled={!editMode}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Zip Code</label>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.permanentAddress.zipCode}
                                onChange={(e) => handleNestedFieldChange('permanentAddress', 'zipCode', e.target.value)}
                                disabled={!editMode}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Country</label>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.permanentAddress.country}
                                onChange={(e) => handleNestedFieldChange('permanentAddress', 'country', e.target.value)}
                                disabled={!editMode}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hierarchy */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3 text-uppercase small text-muted">Hierarchy & Permissions</h6>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Management Level</label>
                        <input
                          type="text"
                          className="form-control"
                          value={`L${user?.managementLevel || 0} - ${
                            user?.managementLevel === 4 ? 'CEO/Owner' :
                            user?.managementLevel === 3 ? 'Admin' :
                            user?.managementLevel === 2 ? 'Senior Manager' :
                            user?.managementLevel === 1 ? 'Manager' : 'Employee'
                          }`}
                          disabled
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Reporting Manager</label>
                        <input
                          type="text"
                          className="form-control"
                          value={user?.reportingManager ? `${user.reportingManager.firstName} ${user.reportingManager.lastName}` : 'No Manager'}
                          disabled
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label">Approve Leaves</label>
                        <input type="text" className="form-control" value={user?.canApproveLeaves ? 'Yes' : 'No'} disabled />
                      </div>
                      <div className="col-6">
                        <label className="form-label">Manage Attendance</label>
                        <input type="text" className="form-control" value={user?.canManageAttendance ? 'Yes' : 'No'} disabled />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Saturday Schedule</label>
                        <input type="text" className="form-control" value={user?.saturdayWorking ? 'Working Saturday' : 'Saturday Off'} disabled />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assets */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-3 text-uppercase small text-muted">Assets Allocated</h6>
                    <label className="form-label">Assigned Assets</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={user?.assets?.length
                        ? user.assets.map((asset) => `${asset.name} (${asset.status})`).join('\n')
                        : (user?.assetsAllocated || 'No assets allocated')}
                      disabled
                    />
                    <small className="text-muted">Contact HR/Admin for asset changes</small>
                  </div>
                </div>
              </div>
            </div>

            {editMode && (
              <div className="mt-3 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => { setEditMode(false); fetchUserProfile(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Password</h5>
                <button type="button" className="btn-close" onClick={() => { setShowPasswordModal(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}></button>
              </div>
              <form onSubmit={handleChangePassword}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      minLength="6"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    />
                    <small className="text-muted">At least 6 characters</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowPasswordModal(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      {showCropModal && imageToCrop && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adjust Profile Photo</h5>
                <button type="button" className="btn-close" onClick={handleCropCancel}></button>
              </div>
              <div className="modal-body p-0">
                <div className="crop-container" style={{ position: 'relative', height: '350px', background: '#1a1a1a' }}>
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>
                <div className="p-3">
                  <label className="form-label d-flex align-items-center gap-2 mb-0">
                    <i className="bi bi-zoom-out"></i>
                    <input
                      type="range"
                      className="form-range flex-grow-1"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                    />
                    <i className="bi bi-zoom-in"></i>
                  </label>
                  <p className="text-muted text-center mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
                    Drag to reposition, use slider to zoom
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCropCancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCropConfirm}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      Save Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
