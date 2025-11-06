import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Event from '../models/Event.js';
import Feed from '../models/Feed.js';
import Recognition from '../models/Recognition.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Event.deleteMany({});
    await Feed.deleteMany({});
    await Recognition.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create Departments
    const departments = await Department.create([
      {
        name: 'Human Resources',
        description: 'Manages recruitment, employee relations, and company culture',
      },
      {
        name: 'Engineering',
        description: 'Software development and technical operations',
      },
      {
        name: 'Marketing',
        description: 'Brand management and marketing campaigns',
      },
      {
        name: 'Sales',
        description: 'Customer acquisition and revenue generation',
      },
      {
        name: 'Finance',
        description: 'Financial planning and accounting',
      },
    ]);

    console.log('✅ Departments created');

    // Create Users
    const users = await User.create([
      {
        employeeId: 'ADMIN001',
        email: 'admin@redaxis.com',
        password: 'Admin@123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        managementLevel: 3, // L3 - Admin/CEO
        department: departments[0]._id,
        position: 'System Administrator',
        phone: '+1234567890',
        dateOfBirth: new Date('1985-01-15'),
        joiningDate: new Date('2020-01-01'),
        salary: {
          basic: 80000,
          allowances: 20000,
          deductions: 5000,
        },
        status: 'active',
        canApproveLeaves: true,
        canManageAttendance: true,
      },
      {
        employeeId: 'HR001',
        email: 'maria@redaxis.com',
        password: 'Maria@123',
        firstName: 'Maria',
        lastName: "D'Souza",
        role: 'hr',
        managementLevel: 2, // L2 - Senior Manager
        department: departments[0]._id,
        position: 'Senior HR Manager',
        phone: '+1234567891',
        dateOfBirth: new Date('1990-05-20'),
        joiningDate: new Date('2021-03-15'),
        salary: {
          basic: 65000,
          allowances: 15000,
          deductions: 4000,
        },
        status: 'active',
        canApproveLeaves: true,
        canManageAttendance: true,
      },
      {
        employeeId: 'EMP001',
        email: 'john@redaxis.com',
        password: 'John@123',
        firstName: 'John',
        lastName: 'Cena',
        role: 'employee',
        managementLevel: 1, // L1 - Manager
        department: departments[1]._id,
        position: 'Engineering Manager',
        phone: '+1234567892',
        dateOfBirth: new Date('1988-08-10'),
        joiningDate: new Date('2021-06-01'),
        salary: {
          basic: 70000,
          allowances: 18000,
          deductions: 4500,
        },
        status: 'active',
        canApproveLeaves: true,
        canManageAttendance: true,
      },
      {
        employeeId: 'EMP002',
        email: 'sarah@redaxis.com',
        password: 'Sarah@123',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'employee',
        managementLevel: 0, // L0 - Employee
        department: departments[2]._id,
        position: 'Marketing Specialist',
        phone: '+1234567893',
        dateOfBirth: new Date('1992-03-25'),
        joiningDate: new Date('2022-01-10'),
        salary: {
          basic: 60000,
          allowances: 15000,
          deductions: 3800,
        },
        status: 'active',
      },
      {
        employeeId: 'EMP003',
        email: 'david@redaxis.com',
        password: 'David@123',
        firstName: 'David',
        lastName: 'Smith',
        role: 'employee',
        managementLevel: 0, // L0 - Employee
        department: departments[3]._id,
        position: 'Sales Executive',
        phone: '+1234567894',
        dateOfBirth: new Date('1991-11-08'),
        joiningDate: new Date('2022-04-01'),
        salary: {
          basic: 55000,
          allowances: 12000,
          deductions: 3500,
        },
        status: 'active',
      },
      {
        employeeId: 'EMP004',
        email: 'emily@redaxis.com',
        password: 'Emily@123',
        firstName: 'Emily',
        lastName: 'Brown',
        role: 'employee',
        managementLevel: 0, // L0 - Employee
        department: departments[4]._id,
        position: 'Financial Analyst',
        phone: '+1234567895',
        dateOfBirth: new Date('1993-07-14'),
        joiningDate: new Date('2022-08-15'),
        salary: {
          basic: 62000,
          allowances: 14000,
          deductions: 3900,
        },
        status: 'active',
      },
    ]);

    console.log('✅ Users created');

    // === SET UP REPORTING MANAGER RELATIONSHIPS ===
    // Admin (L3) -> Maria (L2) -> John (L1) -> Sarah, David, Emily (L0)
    
    // Maria (L2) reports to Admin (L3)
    users[1].reportingManager = users[0]._id; // Maria reports to Admin
    await users[1].save();
    
    // John (L1) reports to Maria (L2)
    users[2].reportingManager = users[1]._id; // John reports to Maria
    await users[2].save();
    
    // Sarah, David, Emily (L0) report to John (L1)
    users[3].reportingManager = users[2]._id; // Sarah reports to John
    users[4].reportingManager = users[2]._id; // David reports to John
    users[5].reportingManager = users[2]._id; // Emily reports to John
    await users[3].save();
    await users[4].save();
    await users[5].save();
    
    console.log('✅ Reporting relationships established');
    console.log('   Admin (L3) <- Maria (L2) <- John (L1) <- [Sarah, David, Emily] (L0)');

    // Update department managers
    departments[0].manager = users[1]._id; // Maria as HR manager
    departments[1].manager = users[2]._id; // John as Engineering manager
    await departments[0].save();
    await departments[1].save();

    // Create Events
    const events = await Event.create([
      {
        title: 'Quarterly Hackathon',
        organizer: users[2]._id,
        organizerName: 'John Cena',
        date: new Date('2025-07-15'),
        time: '03:00',
        duration: '30 min',
        timezone: 'Asia/Kolkata',
        conferenceDetails: 'Zoom link will be provided upon confirmation',
        description: 'Company-wide hackathon to foster innovation',
        status: 'scheduled',
        isPublic: true,
      },
      {
        title: 'Employee Onboarding Day',
        organizer: users[1]._id,
        organizerName: "Maria D'Souza",
        date: new Date('2025-07-15'),
        time: '15:30',
        duration: '1 Hour',
        timezone: 'Asia/Kolkata',
        conferenceDetails: 'Conference Room A, 3rd Floor',
        description: 'Welcome session for new employees',
        status: 'scheduled',
        isPublic: true,
      },
      {
        title: 'Team Building Workshop',
        organizer: users[1]._id,
        organizerName: "Maria D'Souza",
        date: new Date('2025-08-01'),
        time: '10:00',
        duration: '3 Hours',
        timezone: 'Asia/Kolkata',
        conferenceDetails: 'Outdoor venue - details to follow',
        description: 'Fun team building activities',
        status: 'scheduled',
        isPublic: true,
      },
    ]);

    console.log('✅ Events created');

    // Create Feed Posts
    await Feed.create([
      {
        author: users[0]._id,
        content: 'Welcome to Redaxis HRMS! We are excited to have everyone on board. Let us work together to build an amazing workplace culture.',
        type: 'announcement',
      },
      {
        author: users[1]._id,
        content: 'Reminder: The quarterly performance reviews will begin next week. Please ensure all self-assessments are completed by Friday.',
        type: 'announcement',
      },
      {
        author: users[2]._id,
        content: 'Great job team on shipping the latest feature! The client is very happy with the results. 🎉',
        type: 'achievement',
      },
    ]);

    console.log('✅ Feed posts created');

    // Create Recognitions
    await Recognition.create([
      {
        from: users[1]._id,
        to: users[2]._id,
        title: 'Outstanding Performance',
        message: 'John consistently goes above and beyond in delivering high-quality work. His dedication to the team is commendable!',
        category: 'excellence',
        isPublic: true,
      },
      {
        from: users[2]._id,
        to: users[3]._id,
        title: 'Team Player',
        message: 'Sarah has been an incredible team player, always ready to help others and share knowledge.',
        category: 'teamwork',
        isPublic: true,
      },
    ]);

    console.log('✅ Recognitions created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n👨‍💼 ADMIN ACCOUNT:');
    console.log('   Email: admin@redaxis.com');
    console.log('   Password: Admin@123');
    console.log('   Role: Administrator (Full Access)');
    console.log('\n👩‍💼 HR MANAGER ACCOUNT:');
    console.log('   Email: maria@redaxis.com');
    console.log('   Password: Maria@123');
    console.log('   Role: HR Manager');
    console.log('\n👨‍💻 EMPLOYEE ACCOUNTS:');
    console.log('   1. Email: john@redaxis.com | Password: John@123 (Engineering)');
    console.log('   2. Email: sarah@redaxis.com | Password: Sarah@123 (Marketing)');
    console.log('   3. Email: david@redaxis.com | Password: David@123 (Sales)');
    console.log('   4. Email: emily@redaxis.com | Password: Emily@123 (Finance)');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
