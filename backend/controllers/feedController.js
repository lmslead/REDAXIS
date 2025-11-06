import Feed from '../models/Feed.js';

export const getFeeds = async (req, res) => {
  try {
    const feeds = await Feed.find({ isActive: true })
      .populate('author', 'firstName lastName profileImage position')
      .populate('comments.user', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: feeds.length, data: feeds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFeed = async (req, res) => {
  try {
    req.body.author = req.user.id;
    const feed = await Feed.create(req.body);
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
