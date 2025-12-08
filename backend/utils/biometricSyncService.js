import sql from 'mssql';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import BiometricSyncState from '../models/BiometricSyncState.js';

const toNumberOrDefault = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDefaultLookbackDays = () => Math.max(toNumberOrDefault(process.env.ESSL_LOOKBACK_DAYS, 3), 1);
const getDefaultSyncIntervalMinutes = () => Math.max(toNumberOrDefault(process.env.ESSL_SYNC_INTERVAL_MINUTES, 5), 1);
const getMaxLogsPerPull = () => Math.max(toNumberOrDefault(process.env.ESSL_MAX_LOGS, 5000), 1);
const getDeviceTimezoneOffsetMs = () => toNumberOrDefault(process.env.ESSL_TIMEZONE_OFFSET_MINUTES, 0) * 60 * 1000;

let poolPromise = null;
let schedulerStarted = false;

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeEmpCode = (value = '') => value.trim().toUpperCase();

const daysToMs = (days) => days * 24 * 60 * 60 * 1000;

const parseDateInput = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildUserMatchPipeline = (rawCode) => {
  if (!rawCode) return null;
  const normalized = normalizeEmpCode(rawCode);
  const stripped = normalized.replace(/[^A-Z0-9]/g, '');
  const regexExact = new RegExp(`^${escapeRegExp(rawCode.trim())}$`, 'i');
  const variants = [rawCode.trim(), normalized];
  if (stripped && !variants.includes(stripped)) {
    variants.push(stripped);
  }

  const orClauses = variants.map((val) => ({ employeeId: val }))
    .concat([{ employeeId: regexExact }]);

  if (stripped) {
    orClauses.push({ employeeId: new RegExp(`^${escapeRegExp(stripped)}$`, 'i') });
  }

  orClauses.push({ biometricCode: normalized });
  if (stripped) {
    orClauses.push({ biometricCode: stripped });
  }

  return { $or: orClauses };
};

export const isBiometricSyncConfigured = () => (
  Boolean(
    process.env.ESSL_DB_SERVER &&
    process.env.ESSL_DB_NAME &&
    process.env.ESSL_DB_USER &&
    process.env.ESSL_DB_PASSWORD !== undefined
  )
);

const sanitizeTableName = (tableName = 'HRMS') => {
  const trimmed = tableName.trim();
  if (!trimmed.match(/^[A-Za-z0-9_\.\[\]]+$/)) {
    throw new Error('Invalid ESSL table name provided');
  }
  return trimmed;
};

const getSqlPool = async () => {
  if (!isBiometricSyncConfigured()) {
    throw new Error('ESSL SQL configuration is missing. Skipping sync.');
  }

  if (poolPromise) {
    return poolPromise;
  }

  const config = {
    user: process.env.ESSL_DB_USER,
    password: process.env.ESSL_DB_PASSWORD || '',
    server: process.env.ESSL_DB_SERVER,
    database: process.env.ESSL_DB_NAME,
    port: Number(process.env.ESSL_DB_PORT || 1433),
    connectionTimeout: Number(process.env.ESSL_DB_CONN_TIMEOUT || 15000),
    requestTimeout: Number(process.env.ESSL_DB_REQUEST_TIMEOUT || 30000),
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };

  poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      console.log('✅ Connected to ESSL SQL Server');
      return pool;
    })
    .catch((err) => {
      poolPromise = null;
      console.error('❌ Failed to connect to ESSL SQL Server:', err.message);
      throw err;
    });

  return poolPromise;
};

const normalizeDate = (value, timezoneOffsetMs = getDeviceTimezoneOffsetMs()) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const local = new Date(date.getTime() + timezoneOffsetMs);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - timezoneOffsetMs);
};

const getLocalDateKey = (value, timezoneOffsetMs = getDeviceTimezoneOffsetMs()) => {
  if (!value) return null;
  const local = new Date(value.getTime() + timezoneOffsetMs);
  return local.toISOString().split('T')[0];
};

const calculateWorkingHours = (start, end) => {
  if (!start || !end) return 0;
  const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.max(Math.round(diff * 100) / 100, 0);
};

const deriveStatusFromHours = (hours) => {
  if (!hours || hours < 5) return 'absent';
  if (hours >= 5 && hours < 7.5) return 'half-day';
  return 'present';
};

const buildLogQuery = () => {
  const table = sanitizeTableName(process.env.ESSL_DB_TABLE || 'HRMS');
  const logDateExpr = 'DATEADD(SECOND, DATEDIFF(SECOND, 0, [Log_Time]), CAST([Log_Date] AS DATETIME))';
  return {
    query: `
      SELECT TOP (@limit)
        [Emp_Code] AS EmpCode,
        [Direction] AS Direction,
        [Device_Id] AS DeviceId,
        ${logDateExpr} AS RawLogDateTime,
        CONVERT(date, [Log_Date]) AS LogDateOnly,
        CONVERT(varchar(8), [Log_Time], 108) AS LogTimeText
      FROM ${table}
      WHERE ${logDateExpr} > @since
      ORDER BY ${logDateExpr} ASC
    `,
    logDateExpr,
  };
};

const combineLogDateTime = (row, timezoneOffsetMs = getDeviceTimezoneOffsetMs()) => {
  if (row.LogDateOnly && row.LogTimeText) {
    const [h = 0, m = 0, s = 0] = row.LogTimeText.split(':').map((part) => Number(part) || 0);
    const logDate = new Date(row.LogDateOnly);
    if (!Number.isNaN(logDate.getTime())) {
      const combinedUTC = Date.UTC(
        logDate.getUTCFullYear(),
        logDate.getUTCMonth(),
        logDate.getUTCDate(),
        h,
        m,
        s
      );
      return new Date(combinedUTC - timezoneOffsetMs);
    }
  }

  if (row.RawLogDateTime) {
    const raw = new Date(row.RawLogDateTime);
    if (!Number.isNaN(raw.getTime())) {
      return new Date(raw.getTime() - timezoneOffsetMs);
    }
  }

  return null;
};

const fetchLogsSince = async (since) => {
  const pool = await getSqlPool();
  const request = pool.request();
  const safeSince = new Date(since.getTime());
  request.input('since', sql.DateTime, safeSince);
  request.input('limit', sql.Int, getMaxLogsPerPull());

  const { query } = buildLogQuery();
  const result = await request.query(query);
  return result.recordset || [];
};

const groupLogsByEmployeeAndDate = (rows, timezoneOffsetMs = getDeviceTimezoneOffsetMs()) => {
  const buckets = new Map();

  rows.forEach((row) => {
    const empCode = (row.EmpCode || '').trim();
    const direction = (row.Direction || '').toLowerCase();
    const logTime = combineLogDateTime(row, timezoneOffsetMs);

    if (!empCode || !logTime || !['in', 'out'].includes(direction)) {
      return;
    }

    const dateKey = getLocalDateKey(logTime, timezoneOffsetMs);
    const bucketKey = `${empCode}-${dateKey}`;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        empCode,
        deviceId: row.DeviceId ? String(row.DeviceId) : undefined,
        date: normalizeDate(logTime, timezoneOffsetMs),
        firstIn: null,
        lastOut: null,
        logsCount: 0,
        earliestLog: logTime,
        latestLog: logTime,
        localDateKey: dateKey,
      });
    }

    const bucket = buckets.get(bucketKey);
    bucket.logsCount += 1;

    if (logTime < bucket.earliestLog) {
      bucket.earliestLog = logTime;
    }

    if (bucket.deviceId === undefined && row.DeviceId !== undefined) {
      bucket.deviceId = String(row.DeviceId);
    }

    if (logTime > bucket.latestLog) {
      bucket.latestLog = logTime;
      if (row.DeviceId !== undefined) {
        bucket.deviceId = String(row.DeviceId);
      }
    }

    if (direction === 'in') {
      if (!bucket.firstIn || logTime < bucket.firstIn) {
        bucket.firstIn = logTime;
      }
    } else if (direction === 'out') {
      if (!bucket.lastOut || logTime > bucket.lastOut) {
        bucket.lastOut = logTime;
      }
    }
  });

  return Array.from(buckets.values());
};

export const syncBiometricLogs = async ({
  manualTrigger = false,
  forceResync = false,
  resyncFromDate,
  lookbackDays,
} = {}) => {
  if (!isBiometricSyncConfigured()) {
    const message = 'ESSL SQL configuration missing. Device sync skipped.';
    console.warn(message);
    return { success: false, message };
  }

  try {
    const state = await BiometricSyncState.findOne({ scope: 'attendance' });
    const defaultLookbackDays = getDefaultLookbackDays();
    const effectiveLookbackDays = Math.max(Number(lookbackDays) || defaultLookbackDays, 1);
    const fallbackSince = new Date(Date.now() - daysToMs(effectiveLookbackDays));
    fallbackSince.setHours(0, 0, 0, 0);

    const forcedSince = parseDateInput(resyncFromDate);
    const useForcedSince = forceResync && forcedSince;
    const baseSince = useForcedSince
      ? forcedSince
      : forceResync
        ? fallbackSince
        : (state?.lastSyncedAt || fallbackSince);

    const querySince = new Date(baseSince.getTime() - 1000);

    const rows = await fetchLogsSince(querySince);

    if (!rows.length) {
      return {
        success: true,
        message: 'No new biometric logs to process',
        lastSyncedAt: state?.lastSyncedAt || null,
        effectiveSince: baseSince,
        forceResyncApplied: Boolean(forceResync),
        lookbackDays: effectiveLookbackDays,
        rowsFetched: 0,
      };
    }

    const timezoneOffsetMs = getDeviceTimezoneOffsetMs();
    const buckets = groupLogsByEmployeeAndDate(rows, timezoneOffsetMs);
    let processed = 0;
    let createdRecords = 0;
    let updatedRecords = 0;
    let skippedRecords = 0;
    let leaveLocked = 0;
    let noUserMatches = 0;
    const skippedDetails = [];
    let latestLogTime = baseSince;
    let latestBucket = null;

    for (const bucket of buckets) {
      if (bucket.latestLog > latestLogTime) {
        latestLogTime = bucket.latestLog;
        latestBucket = bucket;
      }

      const userQuery = buildUserMatchPipeline(bucket.empCode);
      const user = userQuery ? await User.findOne(userQuery) : null;
      if (!user) {
        skippedRecords += 1;
        noUserMatches += 1;
        if (skippedDetails.length < 25) {
          skippedDetails.push({ empCode: bucket.empCode, date: bucket.date, reason: 'employee-not-found' });
        }
        continue;
      }

      const attendanceDate = bucket.date;
      let attendance = await Attendance.findOne({ employee: user._id, date: attendanceDate });

      if (attendance && attendance.source === 'leave') {
        leaveLocked += 1;
        if (skippedDetails.length < 25) {
          skippedDetails.push({ empCode: bucket.empCode, date: bucket.date, reason: 'leave-lock' });
        }
        continue;
      }

      const isNew = !attendance;
      const previousCheckIn = attendance?.checkIn;
      const previousCheckOut = attendance?.checkOut;

      if (!attendance) {
        attendance = new Attendance({
          employee: user._id,
          date: attendanceDate,
          status: 'absent',
          source: 'device',
        });
      }

      const resolvedCheckIn = bucket.firstIn && bucket.earliestLog
        ? (bucket.firstIn < bucket.earliestLog ? bucket.firstIn : bucket.earliestLog)
        : (bucket.firstIn || bucket.earliestLog);
      const resolvedCheckOut = bucket.lastOut && bucket.latestLog
        ? (bucket.lastOut > bucket.latestLog ? bucket.lastOut : bucket.latestLog)
        : (bucket.lastOut || bucket.latestLog);

      if (resolvedCheckIn && (!attendance.checkIn || resolvedCheckIn < attendance.checkIn)) {
        attendance.checkIn = resolvedCheckIn;
      }

      if (resolvedCheckOut && (!attendance.checkOut || resolvedCheckOut > attendance.checkOut)) {
        attendance.checkOut = resolvedCheckOut;
      }

      if (attendance.checkIn && attendance.checkOut && attendance.checkOut < attendance.checkIn) {
        const fallbackCheckout = bucket.latestLog && bucket.latestLog > attendance.checkIn
          ? bucket.latestLog
          : null;
        const fallbackCheckin = bucket.earliestLog && bucket.earliestLog < attendance.checkOut
          ? bucket.earliestLog
          : null;

        if (fallbackCheckout && fallbackCheckout >= attendance.checkIn) {
          attendance.checkOut = fallbackCheckout;
        } else if (fallbackCheckin && fallbackCheckin <= attendance.checkOut) {
          attendance.checkIn = fallbackCheckin;
        }

        if (attendance.checkOut < attendance.checkIn) {
          attendance.checkOut = null;
        }
      }

      attendance.source = 'device';
      attendance.deviceSyncMeta = {
        empCode: bucket.empCode,
        deviceId: bucket.deviceId,
        logsCount: bucket.logsCount,
        lastLogTimestamp: bucket.latestLog,
        manualTrigger,
      };

      if (attendance.checkIn && attendance.checkOut && attendance.checkOut >= attendance.checkIn) {
        const hours = calculateWorkingHours(attendance.checkIn, attendance.checkOut);
        attendance.workingHours = hours;
        attendance.status = deriveStatusFromHours(hours);
      } else if (attendance.checkIn && !attendance.checkOut) {
        attendance.workingHours = 0;
        attendance.status = 'absent';
      }

      await attendance.save();
      processed += 1;

      if (isNew) {
        createdRecords += 1;
      } else if (
        previousCheckIn?.getTime() !== attendance.checkIn?.getTime() ||
        previousCheckOut?.getTime() !== attendance.checkOut?.getTime()
      ) {
        updatedRecords += 1;
      }
    }

    if (latestBucket) {
      await BiometricSyncState.findOneAndUpdate(
        { scope: 'attendance' },
        {
          lastSyncedAt: latestLogTime,
          lastEmpCode: latestBucket.empCode,
          lastDeviceId: latestBucket.deviceId,
          lastLogTimestamp: latestLogTime,
          meta: {
            processedBuckets: buckets.length,
            manualTrigger,
            forceResync,
            lookbackDays: effectiveLookbackDays,
          },
        },
        { upsert: true, new: true }
      );
    }

    return {
      success: true,
      message: processed
        ? `Processed ${processed} biometric buckets`
        : 'Biometric logs fetched but no employee matches found',
      processedRecords: processed,
      createdRecords,
      updatedRecords,
      skippedRecords,
      leaveLocked,
      noUserMatches,
      skippedDetails,
      groupedBuckets: buckets.length,
      lastSyncedAt: latestLogTime,
      effectiveSince: baseSince,
      forceResyncApplied: Boolean(forceResync),
      lookbackDays: effectiveLookbackDays,
      rowsFetched: rows.length,
    };
  } catch (error) {
    console.error('❌ Biometric sync error:', error);
    poolPromise = null;
    return { success: false, message: error.message };
  }
};

export const startBiometricSyncScheduler = () => {
  if (schedulerStarted) {
    return;
  }

  if (!isBiometricSyncConfigured()) {
    console.warn('Biometric sync scheduler skipped. Missing ESSL SQL configuration.');
    return;
  }

  schedulerStarted = true;
  const intervalMinutes = getDefaultSyncIntervalMinutes();
  const intervalMs = intervalMinutes * 60 * 1000;

  setTimeout(() => {
    syncBiometricLogs().catch((err) => console.error('Initial biometric sync failed:', err));
  }, 10000);

  setInterval(() => {
    syncBiometricLogs().catch((err) => console.error('Scheduled biometric sync failed:', err));
  }, intervalMs);

  console.log(`✅ Biometric sync scheduler started (every ${intervalMinutes} minute(s))`);
};
