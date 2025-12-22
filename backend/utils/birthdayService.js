import Feed from '../models/Feed.js';
import User from '../models/User.js';

let schedulerStarted = false;
let cachedAuthorId = null;
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const tzFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getTzParts = (date) => {
  const [day, month, year] = tzFormatter.format(date).split('/');
  return {
    day: Number(day),
    month: Number(month),
    year: Number(year),
  };
};

// We no longer send external emails as per requirement; greetings are posted in-app only.

const resolveFeedAuthorId = async (fallbackUserId) => {
  if (process.env.BIRTHDAY_FEED_AUTHOR_ID) {
    return process.env.BIRTHDAY_FEED_AUTHOR_ID;
  }
  if (cachedAuthorId) return cachedAuthorId;

  const adminUser = await User.findOne({ managementLevel: { $gte: 3 }, isActive: true })
    .select('_id')
    .lean();

  cachedAuthorId = adminUser?._id?.toString() || fallbackUserId;
  return cachedAuthorId;
};

const createBirthdayFeed = async (user) => {
  const now = new Date();
  const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

  const existing = await Feed.findOne({
    type: 'announcement',
    createdAt: { $gte: twentyHoursAgo },
    content: { $regex: user.employeeId || user.firstName || '', $options: 'i' },
  }).lean();

  if (existing) return existing;

  const authorId = await resolveFeedAuthorId(user._id);
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const role = user.position || 'our teammate';

  return Feed.create({
    author: authorId,
    content: `🎂 Let's celebrate ${fullName || 'a teammate'}'s birthday today! ${role ? `${role} • ` : ''}${user.employeeId || ''}`.trim(),
    type: 'announcement',
  });
};

const runBirthdayCheck = async () => {
  const now = new Date();
  const { day: tzDay, month: tzMonth, year: tzYear } = getTzParts(now);

  try {
    const candidates = await User.find({
      isActive: true,
      dateOfBirth: { $exists: true },
    })
      .select('firstName lastName email personalEmail employeeId position department profileImage managementLevel lastBirthdayWishedYear dateOfBirth')
      .populate('department', 'name');

    const birthdayUsers = candidates.filter((user) => {
      if (!user.dateOfBirth) return false;
      const { day, month } = getTzParts(user.dateOfBirth);
      return day === tzDay && month === tzMonth && (user.lastBirthdayWishedYear || 0) < tzYear;
    });

    if (!birthdayUsers.length) {
      return;
    }

    for (const user of birthdayUsers) {
      try {
        await createBirthdayFeed(user).catch((err) => console.warn('Birthday feed creation failed', user._id?.toString(), err.message));
        user.lastBirthdayWishedYear = tzYear;
        await user.save();
      } catch (userErr) {
        console.error('Birthday processing failed for user', user._id?.toString(), userErr);
      }
    }
  } catch (error) {
    console.error('Birthday job error:', error);
  }
};

export const startBirthdayScheduler = () => {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const intervalHours = Number(process.env.BIRTHDAY_JOB_INTERVAL_HOURS || 6);
  const intervalMs = Math.max(intervalHours, 1) * 60 * 60 * 1000;

  setTimeout(() => {
    runBirthdayCheck();
  }, 10_000);

  setInterval(() => {
    runBirthdayCheck();
  }, intervalMs);

  console.log(`✅ Birthday scheduler started (every ${intervalHours} hour(s))`);
};

export const triggerBirthdayCheckNow = async () => runBirthdayCheck();
