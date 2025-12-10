import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import payslipRoutes from './routes/payslipRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import feedRoutes from './routes/feedRoutes.js';
import recognitionRoutes from './routes/recognitionRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import assetsRoutes from './routes/assetsRoutes.js';
import resignationRoutes from './routes/resignationRoutes.js';
import employeeDocumentRoutes from './routes/employeeDocumentRoutes.js';

// Import utilities
import { setupEscalationCron } from './utils/escalationService.js';
import { startBiometricSyncScheduler } from './utils/biometricSyncService.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://rgstaffhub.reddingtonglobal.com', 'http://rgstaffhub.reddingtonglobal.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    // Start escalation cron job after DB connection
    setupEscalationCron();
    startBiometricSyncScheduler();
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/recognition', recognitionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/resignations', resignationRoutes);
app.use('/api/employee-documents', employeeDocumentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RG Staff Hub Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 RG Staff Hub Server running on port ${PORT}`);
});

export default app;
