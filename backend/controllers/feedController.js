import Feed from '../models/Feed.js';

const allowedLayouts = ['classic', 'spotlight', 'poster'];
const accentPalette = ['#2563eb', '#1d4ed8', '#0f766e', '#f97316', '#dc2626', '#9333ea'];

export const getFeeds = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 0, 20);
    const feedsQuery = Feed.find({ isActive: true })
      .populate('author', 'firstName lastName profileImage position')
      .populate('comments.user', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    if (limit > 0) {
      feedsQuery.limit(limit);
    }

    const feeds = await feedsQuery;

    res.status(200).json({ success: true, count: feeds.length, data: feeds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFeed = async (req, res) => {
  try {
    const {
      content,
      type,
      title,
      subtitle,
      ctaLabel,
      ctaLink,
      accentColor,
      layout,
    } = req.body;

    const sanitizedLayout = allowedLayouts.includes(layout) ? layout : 'classic';
    const incomingAccent = (accentColor || '').toLowerCase();
    const sanitizedAccent = accentPalette.includes(incomingAccent)
      ? incomingAccent
      : '#2563eb';

    const payload = {
      author: req.user.id,
      content: content?.trim() || '',
      type: type || 'update',
      title: title?.trim() || undefined,
      subtitle: subtitle?.trim() || undefined,
      ctaLabel: ctaLabel?.trim() || undefined,
      ctaLink: ctaLink?.trim() || undefined,
      accentColor: sanitizedAccent,
      layout: sanitizedLayout,
      attachments: [],
    };

    if (req.file) {
      const relativePath = `/uploads/feed/${req.file.filename}`;
      payload.heroImage = relativePath;
      payload.attachments.push(relativePath);
    }

    const hasPrimaryContent = Boolean(
      (payload.content && payload.content.trim()) || payload.title || payload.heroImage
    );

    if (!hasPrimaryContent) {
      return res.status(400).json({
        success: false,
        message: 'Please add content, a title, or upload an image to create a post.',
      });
    }

    const feed = await Feed.create(payload);
    res.status(201).json({ success: true, data: feed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likeFeed = async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) {
      return res.status(404).json({ success: false, message: 'Feed not found' });
    }

    const index = feed.likes.indexOf(req.user.id);
    if (index > -1) {
      feed.likes.splice(index, 1);
    } else {
      feed.likes.push(req.user.id);
    }

    await feed.save();
    res.status(200).json({ success: true, data: feed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const commentFeed = async (req, res) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) {
      return res.status(404).json({ success: false, message: 'Feed not found' });
    }

    feed.comments.push({
      user: req.user.id,
      text: req.body.text,
    });

    await feed.save();
    res.status(200).json({ success: true, data: feed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
