import { useState, useEffect } from 'react';
import { feedAPI, getUser } from '../services/api';
import './Feed.css';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commentText, setCommentText] = useState({});
  
  const currentUser = getUser();
  const canCreate = currentUser?.managementLevel >= 2; // L2 and L3 can create announcements

  const [newPost, setNewPost] = useState({
    content: '',
    type: 'update',
  });

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

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await feedAPI.create(newPost);
      alert('Post created successfully!');
      setShowCreateModal(false);
      setNewPost({ content: '', type: 'update' });
      fetchPosts();
    } catch (error) {
      alert(error.message || 'Failed to create post');
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
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <i className="bi bi-plus-circle me-2"></i>Create Post
            </button>
          </div>
        )}
      </div>

      <div className="row">
        <div className="col-lg-8 mx-auto">
          {posts.map(post => {
            const postStyle = getPostIcon(post.type);
            return (
              <div key={post._id} className="card border-0 shadow-sm mb-3">
                <div className="card-body">
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
                            {post.author?.position || post.author?.role} • {new Date(post.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                        <span className={`badge bg-${postStyle.color}`}>
                          {postStyle.icon} {post.type?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mb-3">{post.content}</p>

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
                <button type="button" className="btn-close" onClick={() => { setShowCreateModal(false); setNewPost({ content: '', type: 'update' }); }}></button>
              </div>
              <form onSubmit={handleCreatePost}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Post Type</label>
                    <select
                      className="form-select"
                      value={newPost.type}
                      onChange={(e) => setNewPost({ ...newPost, type: e.target.value })}
                      required
                    >
                      <option value="update">Update</option>
                      <option value="announcement">Announcement</option>
                      <option value="achievement">Achievement</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Content</label>
                    <textarea
                      className="form-control"
                      rows="5"
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      required
                      placeholder="What would you like to share?"
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setNewPost({ content: '', type: 'update' }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Post
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

export default Feed;
