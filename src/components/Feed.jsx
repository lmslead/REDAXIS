import { useState, useEffect } from 'react';
import { feedAPI, getUser, getPublicAssetUrl } from '../services/api';
import './Feed.css';

const accentOptions = [
  { label: 'Royal', value: '#2563eb' },
  { label: 'Indigo', value: '#1d4ed8' },
  { label: 'Emerald', value: '#0f766e' },
  { label: 'Sunrise', value: '#f97316' },
  { label: 'Crimson', value: '#dc2626' },
  { label: 'Violet', value: '#9333ea' },
];

const layoutOptions = [
  { label: 'Classic Bulletin', value: 'classic' },
  { label: 'Spotlight Feature', value: 'spotlight' },
  { label: 'Poster Showcase', value: 'poster' },
];

const createInitialPostState = () => ({
  content: '',
  type: 'update',
  title: '',
  subtitle: '',
  layout: 'classic',
  accentColor: accentOptions[0].value,
  ctaLabel: '',
  ctaLink: '',
  heroImageFile: null,
});

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [newPost, setNewPost] = useState(() => createInitialPostState());
  const [imagePreview, setImagePreview] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);
  const [showDesignOptions, setShowDesignOptions] = useState(false);
  const [heroLightbox, setHeroLightbox] = useState({ open: false, src: '', caption: '' });
  
  const currentUser = getUser();
  const canCreate = currentUser?.managementLevel >= 2; // L2 and L3 can create announcements

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await feedAPI.getAll();
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const resetPostForm = () => {
    setNewPost(createInitialPostState());
    setShowDesignOptions(false);
    setImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return '';
    });
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetPostForm();
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setNewPost((prev) => ({ ...prev, heroImageFile: file || null }));
    setImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : '';
    });
  };

  const removeHeroImage = () => {
    setNewPost((prev) => ({ ...prev, heroImageFile: null }));
    setImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return '';
    });
  };

  const getHeroImageUrl = (post) => {
    const assetPath = post.heroImage || post.attachments?.[0];
    return getPublicAssetUrl(assetPath);
  };

  const openHeroPreview = (post) => {
    const src = getHeroImageUrl(post);
    if (!src) return;
    setHeroLightbox({
      open: true,
      src,
      caption: post.title || `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim(),
    });
  };

  const closeHeroPreview = () => setHeroLightbox({ open: false, src: '', caption: '' });

  const normalizeLink = (link) => {
    if (!link) {
      return '';
    }
    return /^https?:\/\//i.test(link) ? link : `https://${link}`;
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      setCreatingPost(true);
      const formData = new FormData();
      formData.append('type', newPost.type);
      formData.append('layout', newPost.layout);
      formData.append('accentColor', newPost.accentColor);

      if (newPost.content?.trim()) {
        formData.append('content', newPost.content.trim());
      }
      if (newPost.title?.trim()) {
        formData.append('title', newPost.title.trim());
      }
      if (newPost.subtitle?.trim()) {
        formData.append('subtitle', newPost.subtitle.trim());
      }
      if (newPost.ctaLabel?.trim() && newPost.ctaLink?.trim()) {
        formData.append('ctaLabel', newPost.ctaLabel.trim());
        formData.append('ctaLink', newPost.ctaLink.trim());
      }
      if (newPost.heroImageFile) {
        formData.append('heroImage', newPost.heroImageFile);
      }

      await feedAPI.create(formData);
      alert('Post created successfully!');
      closeCreateModal();
      fetchPosts();
    } catch (error) {
      alert(error.message || 'Failed to create post');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await feedAPI.like(postId);
      fetchPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId];
    if (!text || !text.trim()) return;

    try {
      await feedAPI.comment(postId, { text });
      setCommentText({ ...commentText, [postId]: '' });
      fetchPosts();
    } catch (error) {
      alert(error.message || 'Failed to add comment');
    }
  };

  const getPostIcon = (type) => {
    switch (type) {
      case 'announcement':
        return { icon: '📢', color: 'danger' };
      case 'achievement':
        return { icon: '🏆', color: 'success' };
      case 'update':
        return { icon: '📰', color: 'primary' };
      default:
        return { icon: '📝', color: 'info' };
    }
  };

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
          <h2 className="fw-bold">Company Feed</h2>
          <p className="text-muted">Stay updated with company news and announcements</p>
        </div>
        {canCreate && (
          <div className="col-auto">
            <button className="btn btn-primary" onClick={() => { resetPostForm(); setShowCreateModal(true); }}>
              <i className="bi bi-plus-circle me-2"></i>Create Post
            </button>
          </div>
        )}
      </div>

      <div className="row">
        <div className="col-lg-8 mx-auto">
          {posts.map(post => {
            const postStyle = getPostIcon(post.type);
            const heroImageUrl = getHeroImageUrl(post);
            const accentColor = post.accentColor || '#2563eb';
            const layout = post.layout || 'classic';
            const showHeroTop = layout !== 'classic' && heroImageUrl;
            const createdDate = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={post._id}
                className={`card border-0 shadow-sm mb-3 feed-card feed-card--${layout}`}
                style={{ '--feed-accent': accentColor }}
              >
                {showHeroTop && (
                  <button type="button" className="feed-card__hero" onClick={() => openHeroPreview(post)}>
                    <img src={heroImageUrl} alt="Post visual" />
                  </button>
                )}
                <div className="card-body feed-card__body">
                  <div className="d-flex align-items-start mb-3">
                    <img
                      src={post.author?.profileImage || '/assets/client.jpg'}
                      alt={post.author?.firstName}
                      className="rounded-circle me-3"
                      style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                    />
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="fw-bold mb-0">
                            {post.author?.firstName} {post.author?.lastName}
                          </h6>
                          <small className="text-muted">
                            {post.author?.position || post.author?.role} • {createdDate}
                          </small>
                        </div>
                        <span className={`badge feed-type-badge bg-${postStyle.color}`}>
                          {postStyle.icon} {post.type?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {post.title && <h4 className="feed-card__title mb-1">{post.title}</h4>}
                  {post.subtitle && <p className="text-muted mb-2 feed-card__subtitle">{post.subtitle}</p>}
                  {post.content && <p className="mb-3">{post.content}</p>}

                  {heroImageUrl && !showHeroTop && (
                    <button type="button" className="feed-card__hero feed-card__hero--inline mb-3" onClick={() => openHeroPreview(post)}>
                      <img src={heroImageUrl} alt="Post visual" />
                    </button>
                  )}

                  {post.ctaLabel && post.ctaLink && (
                    <a
                      className="btn btn-sm btn-feed-cta mb-3"
                      style={{ backgroundColor: accentColor }}
                      href={normalizeLink(post.ctaLink)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {post.ctaLabel}
                      <i className="bi bi-arrow-up-right ms-1"></i>
                    </a>
                  )}

                  <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                    <button
                      className={`btn btn-sm ${post.likes?.includes(currentUser._id) ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleLike(post._id)}
                    >
                      <i className="bi bi-hand-thumbs-up me-1"></i>
                      {post.likes?.length || 0} Likes
                    </button>
                    <span className="text-muted">
                      <i className="bi bi-chat me-1"></i>
                      {post.comments?.length || 0} Comments
                    </span>
                  </div>

                  {/* Comments Section */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="mb-3">
                      {post.comments.map((comment, idx) => (
                        <div key={idx} className="d-flex mb-2">
                          <img
                            src={comment.user?.profileImage || '/assets/client.jpg'}
                            alt={comment.user?.firstName}
                            className="rounded-circle me-2"
                            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                          />
                          <div className="bg-light rounded p-2 flex-grow-1">
                            <strong className="d-block">
                              {comment.user?.firstName} {comment.user?.lastName}
                            </strong>
                            <small className="text-muted">{comment.text}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Input */}
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Write a comment..."
                      value={commentText[post._id] || ''}
                      onChange={(e) => setCommentText({ ...commentText, [post._id]: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && handleComment(post._id)}
                    />
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleComment(post._id)}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {posts.length === 0 && (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              <p>No posts yet. Be the first to post!</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && canCreate && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Post</h5>
                <button type="button" className="btn-close" onClick={closeCreateModal}></button>
              </div>
              <form onSubmit={handleCreatePost}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Post Type</label>
                    <select
                      className="form-select"
                      value={newPost.type}
                      onChange={(e) => setNewPost((prev) => ({ ...prev, type: e.target.value }))}
                      required
                    >
                      <option value="update">Update</option>
                      <option value="announcement">Announcement</option>
                      <option value="achievement">Achievement</option>
                      <option value="event">Event</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Headline (optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newPost.title}
                        onChange={(e) => setNewPost((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Celebrating our top performer"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Subheading</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newPost.subtitle}
                        onChange={(e) => setNewPost((prev) => ({ ...prev, subtitle: e.target.value }))}
                        placeholder="Add a supporting message"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Content</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={newPost.content}
                      onChange={(e) => setNewPost((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="What would you like to share?"
                    ></textarea>
                    <small className="text-muted">You can also rely on an image-only post by leaving this field blank.</small>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm feed-design-toggle"
                    onClick={() => setShowDesignOptions((prev) => !prev)}
                  >
                    <i className="bi bi-stars me-1"></i>
                    {showDesignOptions ? 'Hide design & link options' : 'Design & link options'}
                  </button>

                  {showDesignOptions && (
                    <div className="feed-design-panel mt-3">
                      <div className="mb-3">
                        <label className="form-label">Accent color</label>
                        <div className="d-flex flex-wrap gap-2">
                          {accentOptions.map((option) => (
                            <button
                              type="button"
                              key={option.value}
                              className={`feed-accent-swatch ${newPost.accentColor === option.value ? 'active' : ''}`}
                              style={{ backgroundColor: option.value }}
                              onClick={() => setNewPost((prev) => ({ ...prev, accentColor: option.value }))}
                            >
                              {newPost.accentColor === option.value && <i className="bi bi-check text-white"></i>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Layout</label>
                          <select
                            className="form-select"
                            value={newPost.layout}
                            onChange={(e) => setNewPost((prev) => ({ ...prev, layout: e.target.value }))}
                          >
                            {layoutOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">CTA Label</label>
                          <input
                            type="text"
                            className="form-control"
                            value={newPost.ctaLabel}
                            onChange={(e) => setNewPost((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                            placeholder="e.g., View agenda"
                          />
                          <small className="text-muted">Optional button text</small>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">CTA Link</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newPost.ctaLink}
                          onChange={(e) => setNewPost((prev) => ({ ...prev, ctaLink: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label d-flex justify-content-between align-items-center">
                          Feature image / poster
                          {imagePreview && (
                            <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={removeHeroImage}>
                              Remove
                            </button>
                          )}
                        </label>
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        {imagePreview && (
                          <div className="feed-image-preview mt-2">
                            <img src={imagePreview} alt="Preview" />
                          </div>
                        )}
                        <small className="text-muted">Upload branded creatives or birthday cards (PNG/JPG/WebP, max 5MB).</small>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creatingPost}>
                    {creatingPost ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Publishing...
                      </span>
                    ) : (
                      'Post'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {heroLightbox.open && (
        <div className="feed-hero-lightbox" onClick={closeHeroPreview}>
          <div className="feed-hero-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn-close feed-hero-lightbox__close" onClick={closeHeroPreview}></button>
            <img src={heroLightbox.src} alt={heroLightbox.caption || 'Post attachment'} />
            {heroLightbox.caption && <p className="feed-hero-lightbox__caption">{heroLightbox.caption}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Feed;
