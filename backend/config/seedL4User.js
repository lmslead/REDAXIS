import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const seedL4User = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Check if L4 user already exists
    const existingUser = await User.findOne({ email: 'jyotsana.bora@rg.com' });
    
    if (existingUser) {
      console.log('⚠️  User with email jyotsana.bora@rg.com already exists!');
      console.log('Updating to L4 level...');
      
      existingUser.managementLevel = 4;
      existingUser.canApproveLeaves = true;
      existingUser.canManageAttendance = true;
      existingUser.reportingManager = null;
      await existingUser.save();
      
      console.log('✅ Existing user updated to L4 (CEO/Owner)');
    } else {
      // Create new L4 CEO/Owner user
      const l4User = await User.create({
        employeeId: 'CEO001',
        email: 'jyotsana.bora@rg.com',
        password: 'Admin@123',
        firstName: 'Jyotsana',
        lastName: 'Bora',
        role: 'admin',
        managementLevel: 4, // L4 - CEO/Owner (TOP LEVEL)
        position: 'Chief Executive Officer',
        phone: '+1234567890',
        dateOfBirth: new Date('1980-01-01'),
        joiningDate: new Date('2020-01-01'),
        salary: {
          basic: 150000,
          allowances: 50000,
          deductions: 10000,
        },
        status: 'active',
        canApproveLeaves: true,
        canManageAttendance: true,
        reportingManager: null, // Top level - no reporting manager
        saturdayWorking: false, // Week off on Saturday
      });

      console.log('✅ L4 CEO/Owner user created successfully!');
      console.log('📧 Email: jyotsana.bora@rg.com');
      console.log('🔑 Password: Admin@123');
      console.log('👑 Management Level: L4 (CEO/Owner)');
      console.log('🆔 Employee ID: CEO001');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding L4 user:', error);
    process.exit(1);
  }
};

seedL4User();
