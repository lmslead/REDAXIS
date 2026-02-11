import Poll from '../models/Poll.js';

const isL4User = (user) => (user?.managementLevel || 0) >= 4;

/**
 * Normalize custom vote text for grouping similar responses.
 * - Trims whitespace
 * - Converts to lowercase for comparison
 * - Collapses multiple spaces to single space
 */
const normalizeCustomText = (text) => {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

/**
 * Get a display version of custom text (preserves original casing from first voter)
 */
const getDisplayCustomText = (text) => {
  return String(text || '').trim().replace(/\s+/g, ' ');
};

const normalizeIds = (values = []) => {
  const unique = new Set(
    values
      .map((value) => (value ? value.toString() : ''))
      .filter(Boolean)
  );
  return Array.from(unique);
};

const sanitizeOptions = (options = []) => {
  const cleaned = options
    .map((option) => String(option || '').trim())
    .filter(Boolean);

  const unique = new Set();
  const deduped = [];
  cleaned.forEach((label) => {
    const key = label.toLowerCase();
    if (!unique.has(key)) {
      unique.add(key);
      deduped.push(label);
    }
  });
  return deduped;
};

const canViewPoll = (poll, user) => {
  if (!poll || !user) {
    return false;
  }

  if (isL4User(user)) {
    return true;
  }

  const userId = user._id?.toString();
  if (poll.createdBy?.toString?.() === userId) {
    return true;
  }

  const audienceType = poll.audience?.type || 'all';
  if (audienceType === 'all') {
    return true;
  }

  if (audienceType === 'department') {
    const deptId = user.department?._id || user.department;
    if (!deptId) {
      return false;
    }
    return (poll.audience?.departmentIds || []).some((entry) => {
      const id = entry?._id || entry;
      return id?.toString?.() === deptId.toString();
    });
  }

  if (audienceType === 'custom') {
    return (poll.audience?.userIds || []).some((entry) => {
      const id = entry?._id || entry;
      return id?.toString?.() === userId;
    });
  }

  return false;
};

const canVoteInPoll = (poll, user) => {
  if (!poll || !user) {
    return false;
  }

  if (poll.createdBy?.toString?.() === user._id?.toString()) {
    return true;
  }

  return canViewPoll(poll, user);
};

const buildPollView = (poll, viewer, includeVotes = false) => {
  const data = poll.toObject({ virtuals: true });
  const votes = data.votes || [];

  const viewerId = viewer?._id?.toString();
  const isCreator = poll.createdBy?.toString?.() === viewerId || poll.createdBy?._id?.toString?.() === viewerId;
  const isL4 = isL4User(viewer);
  const canSeeResults = isCreator || isL4;

  // Find viewer's own vote (everyone can see their own vote)
  const viewerVote = viewerId
    ? votes.find((vote) => vote.user?.toString?.() === viewerId || vote.user?._id?.toString?.() === viewerId)
    : null;

  const totalVotes = votes.length;

  // Build option counts (only for those who can see results)
  const optionCounts = (data.options || []).map((option) => {
    const count = canSeeResults
      ? votes.filter((vote) => {
          if (!vote.option) return false;
          return vote.option.toString() === option._id.toString();
        }).length
      : 0;
    return {
      _id: option._id,
      label: option.label,
      count: canSeeResults ? count : null,
    };
  });

  // Group custom votes by normalized text (only for those who can see results)
  const customVotes = votes.filter((vote) => vote.customText);
  const customVotesCount = customVotes.length;

  let groupedCustomResponses = [];
  if (canSeeResults && customVotes.length > 0) {
    const customGroups = new Map();
    
    customVotes.forEach((vote) => {
      const normalizedKey = normalizeCustomText(vote.customText);
      if (!customGroups.has(normalizedKey)) {
        customGroups.set(normalizedKey, {
          text: getDisplayCustomText(vote.customText), // Use first voter's display text
          count: 0,
          voters: [], // Only populated for L4
        });
      }
      const group = customGroups.get(normalizedKey);
      group.count++;
      
      // L4 gets to see who voted
      if (isL4 && vote.user) {
        const voterInfo = typeof vote.user === 'object' ? vote.user : { _id: vote.user };
        group.voters.push({
          _id: voterInfo._id,
          firstName: voterInfo.firstName || '',
          lastName: voterInfo.lastName || '',
          employeeId: voterInfo.employeeId || '',
        });
      }
    });

    groupedCustomResponses = Array.from(customGroups.values()).map((group) => ({
      text: group.text,
      count: group.count,
      voters: isL4 ? group.voters : undefined, // Only L4 sees voters
    }));
  }

  const payload = {
    ...data,
    options: optionCounts,
    totalVotes: canSeeResults ? totalVotes : null,
    customVotesCount: canSeeResults ? customVotesCount : null,
    customResponses: canSeeResults ? groupedCustomResponses : [],
    canSeeResults,
    viewerVote: viewerVote
      ? {
          option: viewerVote.option || null,
          customText: viewerVote.customText || '',
        }
      : null,
  };

  // Only L4 gets full votes array with voter details
  if (includeVotes && isL4) {
    payload.votes = votes;
  } else {
    delete payload.votes;
  }

  return payload;
};

export const getPolls = async (req, res) => {
  try {
    const user = req.user;
    const isL4 = isL4User(user);
    const userId = user?._id;
    const departmentId = user?.department?._id || user?.department;

    const match = isL4
      ? {}
      : {
          $or: [
            { createdBy: userId },
            { 'audience.type': 'all' },
            departmentId
              ? { 'audience.type': 'department', 'audience.departmentIds': departmentId }
              : { _id: null },
            { 'audience.type': 'custom', 'audience.userIds': userId },
          ],
        };

    const polls = await Poll.find(match)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName employeeId managementLevel')
      .populate('audience.departmentIds', 'name');

    const includeVotes = isL4;

    if (includeVotes) {
      await Poll.populate(polls, {
        path: 'votes.user',
        select: 'firstName lastName employeeId department managementLevel',
      });
    }

    const data = polls
      .filter((poll) => canViewPoll(poll, user))
      .map((poll) => buildPollView(poll, user, includeVotes));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPollById = async (req, res) => {
  try {
    const user = req.user;
    const isL4 = isL4User(user);

    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'firstName lastName employeeId managementLevel')
      .populate('audience.departmentIds', 'name');

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    if (!canViewPoll(poll, user)) {
      return res.status(403).json({ success: false, message: 'Access denied for this poll' });
    }

    if (isL4) {
      await poll.populate({
        path: 'votes.user',
        select: 'firstName lastName employeeId department managementLevel',
      });
    }

    res.status(200).json({ success: true, data: buildPollView(poll, user, isL4) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPoll = async (req, res) => {
  try {
    const { title, description, options, allowCustomOption, audienceType, departmentIds, userIds, startDate, endDate } = req.body;

    const cleanedOptions = sanitizeOptions(options);
    if (!allowCustomOption && cleanedOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least two options for the poll.',
      });
    }

    // Validate scheduling
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (parsedStartDate && parsedEndDate && parsedStartDate >= parsedEndDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date.',
      });
    }

    let audience = { type: 'all', departmentIds: [], userIds: [] };

    if (audienceType === 'department') {
      const deptIds = normalizeIds(departmentIds);
      if (!deptIds.length) {
        return res.status(400).json({ success: false, message: 'Select at least one department.' });
      }
      audience = { type: 'department', departmentIds: deptIds, userIds: [] };
    } else if (audienceType === 'custom') {
      const voterIds = normalizeIds(userIds);
      if (!voterIds.length) {
        return res.status(400).json({ success: false, message: 'Select at least one voter.' });
      }
      audience = { type: 'custom', departmentIds: [], userIds: voterIds };
    }

    const poll = await Poll.create({
      title: String(title || '').trim(),
      description: String(description || '').trim(),
      options: cleanedOptions.map((label) => ({ label })),
      allowCustomOption: Boolean(allowCustomOption),
      audience,
      createdBy: req.user._id,
      isActive: true,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    await poll.populate('createdBy', 'firstName lastName employeeId managementLevel');
    await poll.populate('audience.departmentIds', 'name');

    res.status(201).json({ success: true, data: buildPollView(poll, req.user, isL4User(req.user)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    const isL4 = isL4User(req.user);
    const isCreator = poll.createdBy.toString() === req.user._id.toString();

    if (!isCreator && !isL4) {
      return res.status(403).json({ success: false, message: 'You cannot edit this poll.' });
    }

    const hasVotes = poll.votes && poll.votes.length > 0;

    if (hasVotes && (req.body.options || req.body.audienceType || req.body.departmentIds || req.body.userIds)) {
      return res.status(400).json({
        success: false,
        message: 'Poll options or audience cannot be changed once voting has started.',
      });
    }

    if ('title' in req.body) {
      poll.title = String(req.body.title || '').trim();
    }

    if ('description' in req.body) {
      poll.description = String(req.body.description || '').trim();
    }

    if ('allowCustomOption' in req.body) {
      poll.allowCustomOption = Boolean(req.body.allowCustomOption);
    }

    if (!hasVotes) {
      const cleanedOptions = sanitizeOptions(req.body.options || poll.options.map((opt) => opt.label));
      const effectiveAllowCustom = 'allowCustomOption' in req.body ? Boolean(req.body.allowCustomOption) : poll.allowCustomOption;
      if (!effectiveAllowCustom && cleanedOptions.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Please provide at least two options for the poll.',
        });
      }
      poll.options = cleanedOptions.map((label) => ({ label }));

      const audienceType = req.body.audienceType || poll.audience?.type || 'all';
      if (audienceType === 'department') {
        const deptIds = normalizeIds(req.body.departmentIds || poll.audience?.departmentIds || []);
        if (!deptIds.length) {
          return res.status(400).json({ success: false, message: 'Select at least one department.' });
        }
        poll.audience = { type: 'department', departmentIds: deptIds, userIds: [] };
      } else if (audienceType === 'custom') {
        const voterIds = normalizeIds(req.body.userIds || poll.audience?.userIds || []);
        if (!voterIds.length) {
          return res.status(400).json({ success: false, message: 'Select at least one voter.' });
        }
        poll.audience = { type: 'custom', departmentIds: [], userIds: voterIds };
      } else {
        poll.audience = { type: 'all', departmentIds: [], userIds: [] };
      }
    }

    if ('isActive' in req.body) {
      poll.isActive = Boolean(req.body.isActive);
    }

    // Handle scheduling updates
    if ('startDate' in req.body) {
      poll.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    }
    if ('endDate' in req.body) {
      poll.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    }

    // Validate dates
    if (poll.startDate && poll.endDate && poll.startDate >= poll.endDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date.',
      });
    }

    await poll.save();

    await poll.populate('createdBy', 'firstName lastName employeeId managementLevel');
    await poll.populate('audience.departmentIds', 'name');

    res.status(200).json({ success: true, data: buildPollView(poll, req.user, isL4) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    const isL4 = isL4User(req.user);
    const isCreator = poll.createdBy.toString() === req.user._id.toString();

    if (!isCreator && !isL4) {
      return res.status(403).json({ success: false, message: 'You cannot delete this poll.' });
    }

    await Poll.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Poll deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const voteInPoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'firstName lastName employeeId managementLevel')
      .populate('audience.departmentIds', 'name');

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    if (!poll.isActive) {
      return res.status(400).json({ success: false, message: 'This poll is closed.' });
    }

    // Check scheduling
    const now = new Date();
    if (poll.startDate && now < poll.startDate) {
      return res.status(400).json({ success: false, message: 'This poll has not started yet.' });
    }
    if (poll.endDate && now > poll.endDate) {
      return res.status(400).json({ success: false, message: 'This poll has ended.' });
    }

    if (!canVoteInPoll(poll, req.user)) {
      return res.status(403).json({ success: false, message: 'You are not eligible to vote in this poll.' });
    }

    const { optionId, customText } = req.body || {};

    const selectedOption = optionId
      ? poll.options.find((option) => option._id.toString() === optionId)
      : null;

    // Clean and normalize custom text for consistent grouping
    const cleanedCustomText = getDisplayCustomText(customText);

    if (selectedOption) {
      // ok - voting for a predefined option
    } else if (cleanedCustomText && poll.allowCustomOption) {
      // ok - custom response allowed
    } else {
      return res.status(400).json({
        success: false,
        message: poll.allowCustomOption
          ? 'Select an option or enter a custom response.'
          : 'Select a valid option to vote.',
      });
    }

    const existingVote = poll.votes.find(
      (vote) => vote.user.toString() === req.user._id.toString()
    );

    const nextVote = {
      user: req.user._id,
      option: selectedOption ? selectedOption._id : null,
      customText: selectedOption ? '' : cleanedCustomText,
      createdAt: new Date(),
    };

    if (existingVote) {
      existingVote.option = nextVote.option;
      existingVote.customText = nextVote.customText;
      existingVote.createdAt = nextVote.createdAt;
    } else {
      poll.votes.push(nextVote);
    }

    await poll.save();

    const includeVotes = isL4User(req.user);
    if (includeVotes) {
      await poll.populate({
        path: 'votes.user',
        select: 'firstName lastName employeeId department managementLevel',
      });
    }

    res.status(200).json({ success: true, data: buildPollView(poll, req.user, includeVotes) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
