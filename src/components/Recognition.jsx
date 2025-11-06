import { useState, useEffect } from 'react';
import { recognitionAPI, employeesAPI, getUser } from '../services/api';
import './Recognition.css';

const Recognition = () => {
  const [recognitions, setRecognitions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  
  const currentUser = getUser();

  const [newRecognition, setNewRecognition] = useState({
    recipient: '',
    category: 'teamwork',
    message: '',
  });

  const categories = [
    { value: 'teamwork', label: 'Teamwork', icon: '🤝', color: 'primary' },
    { value: 'innovation', label: 'Innovation', icon: '💡', color: 'warning' },
    { value: 'leadership', label: 'Leadership', icon: '🎯', color: 'danger' },
    { value: 'excellence', label: 'Excellence', icon: '⭐', color: 'success' },
    { value: 'dedication', label: 'Dedication', icon: '🏆', color: 'info' },
  ];

  useEffect(() => {
    fetchRecognitions();
    fetchEmployees();
  }, []);

  const fetchRecognitions = async () => {
    try {
      const response = await recognitionAPI.getAll();
      console.log('Fetched recognitions:', response.data);
      console.log('Current user:', currentUser);
      console.log('Current user ID:', currentUser._id || currentUser.id);
      setRecognitions(response.data);
    } catch (error) {
      console.error('Error fetching recognitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleCreateRecognition = async (e) => {
    e.preventDefault();
    try {
      // Transform data to match backend schema
      const recognitionData = {
        to: newRecognition.recipient,
        category: newRecognition.category,
        title: categories.find(c => c.value === newRecognition.category)?.label || 'Recognition',
        message: newRecognition.message,
      };
      
      await recognitionAPI.create(recognitionData);
      alert('Recognition sent successfully!');
      setShowCreateModal(false);
      setNewRecognition({ recipient: '', category: 'teamwork', message: '' });
      fetchRecognitions();
    } catch (error) {
      alert(error.message || 'Failed to send recognition');
    }
  };

  const handleLike = async (recognitionId) => {
    try {
      await recognitionAPI.like(recognitionId);
      fetchRecognitions();
    } catch (error) {
      console.error('Error liking recognition:', error);
    }
  };

  const getCategoryStyle = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat || categories[0];
  };

  const filteredRecognitions = recognitions.filter(rec => {
    if (filter === 'received') {
      // Handle both populated (object) and non-populated (string) recipient IDs
      const recipientId = typeof rec.to === 'object' ? rec.to?._id : rec.to;
      const currentUserId = currentUser._id || currentUser.id;
      
      // Convert both to strings for comparison to avoid type mismatch
      return String(recipientId) === String(currentUserId);
    }
    if (filter === 'given') {
      // Handle both populated (object) and non-populated (string) sender IDs
      const senderId = typeof rec.from === 'object' ? rec.from?._id : rec.from;
      const currentUserId = currentUser._id || currentUser.id;
      
      // Convert both to strings for comparison to avoid type mismatch
      return String(senderId) === String(currentUserId);
    }
    return true; // 'all' filter shows everything
  });
  
  // Debug logging
  console.log('Filter:', filter);
  console.log('Total recognitions:', recognitions.length);
  console.log('Filtered recognitions:', filteredRecognitions.length);

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
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">Employee Recognition</h2>
          <p className="text-muted">Appreciate and celebrate great work</p>
        </div>
        <div className="col-auto">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <i className="bi bi-award me-2"></i>Give Recognition
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h3 className="fw-bold text-primary mb-0">
                {recognitions.filter(r => {
                  const recipientId = typeof r.to === 'object' ? r.to?._id : r.to;
                  const currentUserId = currentUser._id || currentUser.id;
                  return String(recipientId) === String(currentUserId);
                }).length}
              </h3>
              <p className="text-muted mb-0">Recognitions Received</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h3 className="fw-bold text-success mb-0">
                {recognitions.filter(r => {
                  const senderId = typeof r.from === 'object' ? r.from?._id : r.from;
                  const currentUserId = currentUser._id || currentUser.id;
                  return String(senderId) === String(currentUserId);
                }).length}
              </h3>
              <p className="text-muted mb-0">Recognitions Given</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h3 className="fw-bold text-info mb-0">{recognitions.length}</h3>
              <p className="text-muted mb-0">Total Company</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3">
            <i className="bi bi-funnel me-2"></i>Filter Recognitions
          </h6>
          <div className="btn-group w-100" role="group">
            <button
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('all')}
            >
              <i className="bi bi-grid-3x3-gap me-2"></i>
              All Recognitions
              <span className="badge bg-light text-dark ms-2">{recognitions.length}</span>
            </button>
            <button
              className={`btn ${filter === 'received' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('received')}
            >
              <i className="bi bi-inbox me-2"></i>
              Received by Me
              <span className="badge bg-light text-dark ms-2">
                {recognitions.filter(r => {
                  const recipientId = typeof r.to === 'object' ? r.to?._id : r.to;
                  const currentUserId = currentUser._id || currentUser.id;
                  return String(recipientId) === String(currentUserId);
                }).length}
              </span>
            </button>
            <button
              className={`btn ${filter === 'given' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('given')}
            >
              <i className="bi bi-send me-2"></i>
              Given by Me
              <span className="badge bg-light text-dark ms-2">
                {recognitions.filter(r => {
                  const senderId = typeof r.from === 'object' ? r.from?._id : r.from;
                  const currentUserId = currentUser._id || currentUser.id;
                  return String(senderId) === String(currentUserId);
                }).length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Recognitions Grid */}
      <div className="row">
        {filteredRecognitions.map(recognition => {
          const categoryStyle = getCategoryStyle(recognition.category);
          return (
            <div key={recognition._id} className="col-md-6 col-lg-4 mb-4">
              <div className="card border-0 shadow-sm h-100 recognition-card">
                <div className={`card-header bg-${categoryStyle.color} text-white`}>
                  <h5 className="mb-0">
                    <span className="me-2">{categoryStyle.icon}</span>
                    {categoryStyle.label}
                  </h5>
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={recognition.from?.profileImage || '/assets/client.jpg'}
                      alt={recognition.from?.firstName}
                      className="rounded-circle me-2"
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                    <div>
                      <strong className="d-block">
                        {recognition.from?.firstName} {recognition.from?.lastName}
                      </strong>
                      <small className="text-muted">
                        recognized {recognition.to?.firstName} {recognition.to?.lastName}
                      </small>
                    </div>
                  </div>

                  <p className="mb-3">{recognition.message}</p>

                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      className={`btn btn-sm ${
                        recognition.likes?.includes(currentUser._id)
                          ? 'btn-primary'
                          : 'btn-outline-primary'
                      }`}
                      onClick={() => handleLike(recognition._id)}
                    >
                      <i className="bi bi-hand-thumbs-up me-1"></i>
                      {recognition.likes?.length || 0}
                    </button>
                    <small className="text-muted">
                      {new Date(recognition.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredRecognitions.length === 0 && (
          <div className="col-12 text-center py-5 text-muted">
            <i className="bi bi-award fs-1 d-block mb-2"></i>
            {filter === 'received' && <p>You haven't received any recognitions yet.</p>}
            {filter === 'given' && <p>You haven't given any recognitions yet. Be the first to recognize someone!</p>}
            {filter === 'all' && <p>No recognitions found. Be the first to recognize someone!</p>}
          </div>
        )}
      </div>

      {/* Create Recognition Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Give Recognition</h5>
                <button type="button" className="btn-close" onClick={() => { setShowCreateModal(false); setNewRecognition({ recipient: '', category: 'teamwork', message: '' }); }}></button>
              </div>
              <form onSubmit={handleCreateRecognition}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Recognize</label>
                    <select
                      className="form-select"
                      value={newRecognition.recipient}
                      onChange={(e) => setNewRecognition({ ...newRecognition, recipient: e.target.value })}
                      required
                    >
                      <option value="">Select an employee...</option>
                      {employees
                        .filter(emp => emp._id !== currentUser._id)
                        .map(emp => (
                          <option key={emp._id} value={emp._id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeId})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={newRecognition.category}
                      onChange={(e) => setNewRecognition({ ...newRecognition, category: e.target.value })}
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Message</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={newRecognition.message}
                      onChange={(e) => setNewRecognition({ ...newRecognition, message: e.target.value })}
                      required
                      placeholder="Share why you're recognizing this person..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setNewRecognition({ recipient: '', category: 'teamwork', message: '' }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Send Recognition
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recognition;
