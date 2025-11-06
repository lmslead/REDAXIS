import Recognition from '../models/Recognition.js';

export const getRecognitions = async (req, res) => {
  try {
    const recognitions = await Recognition.find({ isPublic: true })
      .populate('from', 'firstName lastName profileImage position')
      .populate('to', 'firstName lastName profileImage position')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: recognitions.length, data: recognitions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRecognition = async (req, res) => {
  try {
    req.body.from = req.user.id;
    const recognition = await Recognition.create(req.body);
    res.status(201).json({ success: true, data: recognition });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likeRecognition = async (req, res) => {
  try {
    const recognition = await Recognition.findById(req.params.id);
    if (!recognition) {
      return res.status(404).json({ success: false, message: 'Recognition not found' });
    }

    const index = recognition.likes.indexOf(req.user.id);
    if (index > -1) {
      recognition.likes.splice(index, 1);
    } else {
      recognition.likes.push(req.user.id);
    }

    await recognition.save();
    res.status(200).json({ success: true, data: recognition });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
