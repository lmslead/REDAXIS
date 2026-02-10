import { useEffect, useMemo, useState } from 'react';
import { departmentsAPI, employeesAPI, getUser, pollsAPI } from '../services/api';
import './Polls.css';

const emptyForm = {
  title: '',
  description: '',
  options: ['',''],
  allowCustomOption: false,
  audienceType: 'all',
  departmentIds: [],
  userIds: [],
  isActive: true,
  startDate: '',
  endDate: '',
};

const normalizeSearch = (value) =>
  String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const getEmployeeLabel = (employee) =>
  `${employee.firstName || ''} ${employee.lastName || ''}`.trim() +
  (employee.employeeId ? ` (${employee.employeeId})` : '');

const getOptionLabel = (poll, optionId) => {
  if (!optionId) {
    return 'Selected option';
  }
  const match = (poll.options || []).find(
    (option) => option._id?.toString?.() === optionId?.toString?.()
  );
  return match?.label || 'Selected option';
};

const getPollStatus = (poll) => {
  if (!poll.isActive) {
    return { label: 'Closed', class: 'poll-status' };
  }
  
  const now = new Date();
  const startDate = poll.startDate ? new Date(poll.startDate) : null;
  const endDate = poll.endDate ? new Date(poll.endDate) : null;
  
  if (startDate && now < startDate) {
    return { label: 'Scheduled', class: 'poll-status poll-status--scheduled' };
  }
  
  if (endDate && now > endDate) {
    return { label: 'Ended', class: 'poll-status poll-status--ended' };
  }
  
  return { label: 'Active', class: 'poll-status poll-status--active' };
};

const canVoteNow = (poll) => {
  if (!poll.isActive) return false;
  
  const now = new Date();
  const startDate = poll.startDate ? new Date(poll.startDate) : null;
  const endDate = poll.endDate ? new Date(poll.endDate) : null;
  
  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;
  
  return true;
};

const formatScheduleDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const Polls = () => {
  const user = getUser();
  const isL4 = (user?.managementLevel || 0) >= 4;
  const canCreate = (user?.managementLevel || 0) >= 3;

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingPoll, setEditingPoll] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showAllOptions, setShowAllOptions] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [voteDrafts, setVoteDrafts] = useState({});
  const [voteLoadingId, setVoteLoadingId] = useState(null);
  const [voteErrors, setVoteErrors] = useState({});

  const [viewerModal, setViewerModal] = useState({ open: false, poll: null });

  const loadPolls = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await pollsAPI.getAll();
      setPolls(response.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load polls.');
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const [deptResponse, employeeResponse] = await Promise.all([
        departmentsAPI.getAll(),
        employeesAPI.getAll(),
      ]);
      setDepartments(deptResponse.data || []);
      setEmployees(employeeResponse.data || []);
    } catch (err) {
      console.error('Failed to load poll metadata:', err);
    }
  };

  useEffect(() => {
    loadPolls();
  }, []);

  useEffect(() => {
    const nextDrafts = {};
    polls.forEach((poll) => {
      if (poll.viewerVote) {
        nextDrafts[poll._id] = {
          optionId: poll.viewerVote.option ? poll.viewerVote.option : 'custom',
          customText: poll.viewerVote.customText || '',
        };
      }
    });
    setVoteDrafts(nextDrafts);
  }, [polls]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) {
      return employees;
    }
    const term = normalizeSearch(employeeSearch);
    return employees.filter((employee) => {
      const haystack = normalizeSearch(
        `${employee.firstName || ''} ${employee.lastName || ''} ${employee.employeeId || ''} ${employee.email || ''}`
      );
      return haystack.includes(term);
    });
  }, [employeeSearch, employees]);

  const openCreateModal = () => {
    setEditingPoll(null);
    setForm(emptyForm);
    setEmployeeSearch('');
    setShowAllOptions(false);
    setShowModal(true);
    loadMeta();
  };

  const openEditModal = (poll) => {
    setEditingPoll(poll);
    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setForm({
      title: poll.title || '',
      description: poll.description || '',
      options: (poll.options || []).map((option) => option.label),
      allowCustomOption: Boolean(poll.allowCustomOption),
      audienceType: poll.audience?.type || 'all',
      departmentIds: (poll.audience?.departmentIds || []).map((dept) => dept._id || dept),
      userIds: poll.audience?.userIds || [],
      isActive: Boolean(poll.isActive),
      startDate: formatDateForInput(poll.startDate),
      endDate: formatDateForInput(poll.endDate),
    });
    setEmployeeSearch('');
    setShowAllOptions((poll.options || []).length <= 4);
    setShowModal(true);
    loadMeta();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPoll(null);
    setForm(emptyForm);
    setShowAllOptions(false);
  };

  const handleOptionChange = (index, value) => {
    const next = [...form.options];
    next[index] = value;
    setForm({ ...form, options: next });
  };

  const handleAddOption = () => {
    setForm({ ...form, options: [...form.options, ''] });
    setShowAllOptions(true);
  };

  const handleRemoveOption = (index) => {
    const next = form.options.filter((_, idx) => idx !== index);
    setForm({ ...form, options: next.length ? next : [''] });
  };

  const handleSavePoll = async (event) => {
    event.preventDefault();
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const hasVotes = editingPoll && (editingPoll.totalVotes || 0) > 0;
      const payload = {
        title: form.title,
        description: form.description,
        options: form.options,
        allowCustomOption: form.allowCustomOption,
        audienceType: form.audienceType,
        departmentIds: form.departmentIds,
        userIds: form.userIds,
        isActive: form.isActive,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      if (hasVotes) {
        delete payload.options;
        delete payload.audienceType;
        delete payload.departmentIds;
        delete payload.userIds;
      }

      const response = editingPoll
        ? await pollsAPI.update(editingPoll._id, payload)
        : await pollsAPI.create(payload);

      if (response?.data) {
        setPolls((prev) => {
          if (editingPoll) {
            return prev.map((poll) => (poll._id === editingPoll._id ? response.data : poll));
          }
          return [response.data, ...prev];
        });
      }

      closeModal();
    } catch (err) {
      setError(err.message || 'Unable to save poll.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Delete this poll? This action cannot be undone.')) {
      return;
    }
    try {
      await pollsAPI.delete(pollId);
      setPolls((prev) => prev.filter((poll) => poll._id !== pollId));
    } catch (err) {
      setError(err.message || 'Unable to delete poll.');
    }
  };

  const handleVoteSelect = (pollId, optionId) => {
    setVoteDrafts((prev) => ({
      ...prev,
      [pollId]: {
        optionId,
        customText: prev[pollId]?.customText || '',
      },
    }));
    setVoteErrors((prev) => ({ ...prev, [pollId]: '' }));
  };

  const handleVoteCustomText = (pollId, value) => {
    setVoteDrafts((prev) => ({
      ...prev,
      [pollId]: {
        optionId: 'custom',
        customText: value,
      },
    }));
  };

  const handleSubmitVote = async (poll) => {
    if (voteLoadingId) {
      return;
    }

    const draft = voteDrafts[poll._id] || {};
    const isCustom = draft.optionId === 'custom';
    const payload = isCustom
      ? { customText: draft.customText }
      : { optionId: draft.optionId };

    if (!payload.optionId && !payload.customText) {
      setVoteErrors((prev) => ({
        ...prev,
        [poll._id]: 'Select an option to vote.',
      }));
      return;
    }

    if (isCustom && !String(draft.customText || '').trim()) {
      setVoteErrors((prev) => ({
        ...prev,
        [poll._id]: 'Enter your custom response to vote.',
      }));
      return;
    }

    setVoteLoadingId(poll._id);
    setVoteErrors((prev) => ({ ...prev, [poll._id]: '' }));

    try {
      const response = await pollsAPI.vote(poll._id, payload);
      if (response?.data) {
        setPolls((prev) => prev.map((item) => (item._id === poll._id ? response.data : item)));
      }
    } catch (err) {
      setVoteErrors((prev) => ({
        ...prev,
        [poll._id]: err.message || 'Unable to submit your vote.',
      }));
    } finally {
      setVoteLoadingId(null);
    }
  };

  const renderAudience = (poll) => {
    const type = poll.audience?.type || 'all';
    if (type === 'all') {
      return 'All employees';
    }
    if (type === 'department') {
      const labels = (poll.audience?.departmentIds || []).map((dept) => dept.name || dept);
      return labels.length ? `Department: ${labels.join(', ')}` : 'Department';
    }
    if (type === 'custom') {
      const count = (poll.audience?.userIds || []).length;
      return count ? `Custom voters (${count})` : 'Custom voters';
    }
    return 'All employees';
  };

  return (
    <div className="polls-page">
      <div className="polls-header">
        <div>
          <div className="polls-eyebrow">Engage</div>
          <h2 className="polls-title">Pulse Polls</h2>
          <p className="polls-subtitle">Run quick votes across teams and track engagement in one place.</p>
        </div>
        {canCreate && (
          <button type="button" className="btn btn-primary polls-create" onClick={openCreateModal}>
            Create poll
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="polls-loading">Loading polls...</div>
      ) : polls.length === 0 ? (
        <div className="polls-empty">
          <div className="polls-empty__card">
            <h5>No polls yet</h5>
            <p>Create a poll to gather quick feedback or decisions from your team.</p>
            {canCreate && (
              <button type="button" className="btn btn-outline-primary" onClick={openCreateModal}>
                Start your first poll
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="polls-grid">
          {polls.map((poll) => {
            const isCreator = poll.createdBy?._id === user?._id;
            const canEdit = isCreator || isL4;
            const customDraft = voteDrafts[poll._id]?.optionId === 'custom';
            const totalVotes = poll.totalVotes || 0;

            return (
              <div key={poll._id} className="poll-card">
                <div className="poll-card__header">
                  <div>
                    <div className="poll-tag">{renderAudience(poll)}</div>
                    <h5 className="poll-title">{poll.title}</h5>
                    {poll.description && <p className="poll-description">{poll.description}</p>}
                  </div>
                  <div className="poll-actions">
                    {canEdit && (
                      <>
                        <button type="button" className="btn btn-sm btn-light" onClick={() => openEditModal(poll)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeletePoll(poll._id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="poll-meta">
                  <span>
                    Created by {poll.createdBy?.firstName || 'User'} {poll.createdBy?.lastName || ''}
                  </span>
                  <span>{new Date(poll.createdAt).toLocaleDateString()}</span>
                  <span className={getPollStatus(poll).class}>
                    {getPollStatus(poll).label}
                  </span>
                </div>

                {(poll.startDate || poll.endDate) && (
                  <div className="poll-schedule-info" style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {poll.startDate && (
                      <span>📅 Starts: {formatScheduleDate(poll.startDate)}</span>
                    )}
                    {poll.endDate && (
                      <span>⏰ Ends: {formatScheduleDate(poll.endDate)}</span>
                    )}
                  </div>
                )}

                <div className="poll-body">
                  <div className="poll-options">
                    {poll.options.map((option) => (
                      <label key={option._id} className="poll-option">
                        <input
                          type="radio"
                          name={`poll-${poll._id}`}
                          value={option._id}
                          checked={voteDrafts[poll._id]?.optionId === option._id}
                          onChange={() => handleVoteSelect(poll._id, option._id)}
                          disabled={!canVoteNow(poll)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}

                    {poll.allowCustomOption && (
                      <label className="poll-option poll-option--custom">
                        <input
                          type="radio"
                          name={`poll-${poll._id}`}
                          value="custom"
                          checked={customDraft}
                          onChange={() => handleVoteSelect(poll._id, 'custom')}
                          disabled={!canVoteNow(poll)}
                        />
                        <span className="poll-option__custom">Custom response</span>
                        {customDraft && (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Enter your response"
                            value={voteDrafts[poll._id]?.customText || ''}
                            onChange={(e) => handleVoteCustomText(poll._id, e.target.value)}
                            disabled={!canVoteNow(poll)}
                          />
                        )}
                      </label>
                    )}
                  </div>

                  {canVoteNow(poll) && (
                    <div className="poll-vote-action">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSubmitVote(poll)}
                        disabled={voteLoadingId === poll._id}
                      >
                        {voteLoadingId === poll._id ? 'Submitting...' : 'Cast vote'}
                      </button>
                      {voteErrors[poll._id] && (
                        <div className="text-danger small">{voteErrors[poll._id]}</div>
                      )}
                    </div>
                  )}

                  {poll.viewerVote && (
                    <div className="poll-vote-note">
                      Your current vote:{' '}
                      {poll.viewerVote.customText || getOptionLabel(poll, poll.viewerVote.option)}
                    </div>
                  )}

                  {poll.canSeeResults ? (
                    <div className="poll-results">
                      <div className="poll-results__header">
                        <span>Results</span>
                        <span>{totalVotes} votes</span>
                      </div>
                      {poll.options.map((option) => {
                        const percent = totalVotes ? Math.round((option.count / totalVotes) * 100) : 0;
                        return (
                          <div key={option._id} className="poll-result">
                            <div className="poll-result__label">
                              <span>{option.label}</span>
                              <span>{option.count} ({percent}%)</span>
                            </div>
                            <div className="poll-result__bar">
                              <div style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                      {poll.allowCustomOption && poll.customResponses?.length > 0 && (
                        <div className="poll-custom-results">
                          <div className="poll-result__label" style={{ fontWeight: 600, marginBottom: '8px', marginTop: '8px', borderTop: '1px dashed rgba(148,163,184,0.4)', paddingTop: '8px' }}>
                            <span>Custom responses</span>
                            <span>{poll.customVotesCount || 0}</span>
                          </div>
                          {poll.customResponses.map((custom, idx) => {
                            const percent = totalVotes ? Math.round((custom.count / totalVotes) * 100) : 0;
                            return (
                              <div key={idx} className="poll-result">
                                <div className="poll-result__label">
                                  <span style={{ fontStyle: 'italic' }}>"{custom.text}"</span>
                                  <span>{custom.count} ({percent}%)</span>
                                </div>
                                <div className="poll-result__bar">
                                  <div style={{ width: `${percent}%` }}></div>
                                </div>
                                {isL4 && custom.voters?.length > 0 && (
                                  <div className="poll-custom-voters" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                    Voted by: {custom.voters.map(v => `${v.firstName} ${v.lastName}`.trim() || v.employeeId).join(', ')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {poll.allowCustomOption && (!poll.customResponses || poll.customResponses.length === 0) && (
                        <div className="poll-result poll-result--custom">
                          <div className="poll-result__label">
                            <span>Custom responses</span>
                            <span>0</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="poll-results-hidden" style={{ background: '#f1f5f9', borderRadius: '10px', padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                      Results are only visible to the poll creator
                    </div>
                  )}
                </div>

                {isL4 && poll.votes?.length > 0 && (
                  <div className="poll-footer">
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm"
                      onClick={() => setViewerModal({ open: true, poll })}
                    >
                      View voters
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg poll-modal__dialog">
            <div className="modal-content poll-modal">
              <div className="modal-header">
                <h5 className="modal-title">{editingPoll ? 'Edit poll' : 'Create poll'}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSavePoll}>
                <div className="modal-body poll-modal__body">
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="What do you want to ask the team?"
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Options</label>
                    <div
                      className={`poll-options-edit ${showAllOptions && form.options.length >= 6 ? 'poll-options-edit--two' : ''}`}
                    >
                      {(showAllOptions ? form.options : form.options.slice(0, 4)).map((option, index) => (
                        <div key={`option-${index}`} className="poll-option-edit">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            disabled={editingPoll && (editingPoll.totalVotes || 0) > 0}
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleRemoveOption(index)}
                            disabled={form.options.length <= 2 || (editingPoll && (editingPoll.totalVotes || 0) > 0)}
                            title="Remove option"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="poll-options-actions">
                      {form.options.length > 4 && (
                        <button
                          type="button"
                          className="btn btn-link p-0"
                          onClick={() => setShowAllOptions((prev) => !prev)}
                        >
                          {showAllOptions ? 'Show fewer options' : `Show all options (${form.options.length})`}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={handleAddOption}
                        disabled={editingPoll && (editingPoll.totalVotes || 0) > 0}
                      >
                        Add another option
                      </button>
                    </div>
                    {editingPoll && (editingPoll.totalVotes || 0) > 0 && (
                      <div className="text-muted small mt-1">
                        Options cannot be changed once voting has started.
                      </div>
                    )}
                  </div>

                  <div className="poll-section-divider">
                    <div className="poll-section-title">Settings</div>
                    <div className="poll-audience-grid">
                      <label className="poll-audience-option">
                        <input
                          type="radio"
                          name="audience"
                          value="all"
                          checked={form.audienceType === 'all'}
                          onChange={() => setForm({ ...form, audienceType: 'all', departmentIds: [], userIds: [] })}
                          disabled={editingPoll && (editingPoll.totalVotes || 0) > 0}
                        />
                        <span>All employees</span>
                      </label>
                      <label className="poll-audience-option">
                        <input
                          type="radio"
                          name="audience"
                          value="department"
                          checked={form.audienceType === 'department'}
                          onChange={() => setForm({ ...form, audienceType: 'department', userIds: [] })}
                          disabled={editingPoll && (editingPoll.totalVotes || 0) > 0}
                        />
                        <span>Departments</span>
                      </label>
                      <label className="poll-audience-option">
                        <input
                          type="radio"
                          name="audience"
                          value="custom"
                          checked={form.audienceType === 'custom'}
                          onChange={() => setForm({ ...form, audienceType: 'custom', departmentIds: [] })}
                          disabled={editingPoll && (editingPoll.totalVotes || 0) > 0}
                        />
                        <span>Custom</span>
                      </label>
                    </div>

                    {form.audienceType === 'department' && (
                      <div className="poll-dept-grid">
                        {departments.map((dept) => (
                          <label key={dept._id} className="poll-check">
                            <input
                              type="checkbox"
                              checked={form.departmentIds.includes(dept._id)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...form.departmentIds, dept._id]
                                  : form.departmentIds.filter((id) => id !== dept._id);
                                setForm({ ...form, departmentIds: next });
                              }}
                              disabled={editingPoll && (editingPoll.totalVotes || 0) > 0}
                            />
                            <span>{dept.name}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {form.audienceType === 'custom' && (
                      <div className="poll-audience-select">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="🔍 Search employees..."
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          disabled={editingPoll && (editingPoll.totalVotes || 0) > 0}
                        />
                        <div className="poll-audience-list">
                          {filteredEmployees.map((employee) => (
                            <label key={employee._id} className="poll-check">
                              <input
                                type="checkbox"
                                checked={form.userIds.includes(employee._id)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...form.userIds, employee._id]
                                    : form.userIds.filter((id) => id !== employee._id);
                                  setForm({ ...form, userIds: next });
                                }}
                                disabled={editingPoll && (editingPoll.totalVotes || 0) > 0}
                              />
                              <span>{getEmployeeLabel(employee)}</span>
                            </label>
                          ))}
                        </div>
                        {form.userIds.length > 0 && (
                          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                            {form.userIds.length} voter{form.userIds.length !== 1 ? 's' : ''} selected
                          </div>
                        )}
                      </div>
                    )}

                    <div className="poll-schedule-section" style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed rgba(148,163,184,0.3)' }}>
                      <div className="poll-section-title" style={{ marginBottom: '10px' }}>Schedule (Optional)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Start Date & Time</label>
                          <input
                            type="datetime-local"
                            className="form-control form-control-sm"
                            value={form.startDate}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>End Date & Time</label>
                          <input
                            type="datetime-local"
                            className="form-control form-control-sm"
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                        Leave empty to start immediately with no end date.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="allowCustomOption"
                          checked={form.allowCustomOption}
                          onChange={(e) => setForm({ ...form, allowCustomOption: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="allowCustomOption">
                          Allow custom responses
                        </label>
                      </div>
                      {editingPoll && (
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="pollActive"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                          />
                          <label className="form-check-label" htmlFor="pollActive">
                            Active
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingPoll ? 'Save changes' : 'Create poll'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewerModal.open && viewerModal.poll && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Votes for {viewerModal.poll.title}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewerModal({ open: false, poll: null })}
                ></button>
              </div>
              <div className="modal-body">
                {(viewerModal.poll.votes || []).map((vote) => (
                  <div key={vote.user?._id || vote._id} className="poll-voter">
                    <div>
                      <div className="poll-voter__name">
                        {vote.user?.firstName || 'User'} {vote.user?.lastName || ''}
                      </div>
                      <div className="poll-voter__meta">{vote.user?.employeeId || ''}</div>
                    </div>
                    <div className="poll-voter__choice">
                      {vote.customText || getOptionLabel(viewerModal.poll, vote.option)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Polls;
