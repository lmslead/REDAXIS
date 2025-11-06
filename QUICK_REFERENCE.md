# HRMS - Quick Reference Card

## 🔐 Test Accounts

| Email | Password | Level | Access |
|-------|----------|-------|--------|
| admin@redaxis.com | Admin@123 | L3 (Admin) | Full system access |
| maria@redaxis.com | Maria@123 | L2 (Senior Manager) | Manage L0/L1 employees |
| john@redaxis.com | John@123 | L1 (Manager) | View/manage team |
| sarah@redaxis.com | Sarah@123 | L0 (Employee) | Own data only |
| david@redaxis.com | David@123 | L0 (Employee) | Own data only |
| emily@redaxis.com | Emily@123 | L0 (Employee) | Own data only |

## 🎯 Quick Permission Check

### "Can I see all attendance records?"
- **YES** if you're L3 (Admin)
- **NO** if you're L0, L1, or L2 (see only your scope)

### "Can I create/edit employees?"
- **YES** if you're L2 or L3
- **L2 can only create/edit L0 and L1**
- **L3 can create/edit anyone**
- **NO** if you're L0 or L1

### "Can I delete employees?"
- **YES** if you're L3 (Admin only)
- **NO** for everyone else

### "Can I manage team attendance?"
- **YES** if you're L1, L2, or L3
- **NO** if you're L0 (can only check-in/out yourself)

## 🚀 How to Test

1. **Clear Browser Cache & Logout** (important!)
2. **Login with admin@redaxis.com / Admin@123**
3. **Go to Attendance page** → Should see ALL employees' data
4. **Go to Employees page** → Should see ALL employees
5. **Try editing/deleting** → Should work (L3 has full access)

## 🔧 Troubleshooting

### Admin can't see all attendance?
1. Logout completely
2. Clear browser localStorage
3. Login again
4. Check if managementLevel is 3 in localStorage

### Permission denied errors?
1. Make sure you ran: `node config/seed.js`
2. Verify managementLevel in database
3. Check backend console logs
4. Logout and login to get fresh token

## 📱 Key URLs

- **Login**: http://localhost:5173/login
- **Attendance**: http://localhost:5173/attendance
- **Employees**: http://localhost:5173/employees
- **Departments**: http://localhost:5173/departments

## 🎨 Visual Indicators

When logged in, check the sidebar:
- **L3 (Admin)**: Can access ALL menu items
- **L2 (Senior Manager)**: Can manage employees & departments
- **L1 (Manager)**: Can view team features
- **L0 (Employee)**: Limited to personal features

## ⚡ Quick Commands

```bash
# Restart backend
cd backend
npm run dev

# Restart frontend
cd ..
npm run dev

# Re-seed database
cd backend
node config/seed.js
```

## 🎯 What Was Fixed

✅ Admin can now see ALL attendance records
✅ Admin can now manage ALL employees
✅ L2 users restricted to L0/L1 employees only
✅ L1 users can only view their team
✅ L0 users restricted to own data
✅ Proper 4-level hierarchy implemented
✅ Database seeded with correct managementLevel values
✅ JWT tokens now include managementLevel

## 📊 Expected Results

### Admin (L3) View
- Attendance page: Shows everyone's records
- Employees page: Shows all employees (L0, L1, L2, L3)
- Can create/edit/delete anyone

### Senior Manager (L2) View
- Attendance page: Shows L0 and L1 in their hierarchy
- Employees page: Shows only L0 and L1 employees
- Can create/edit L0 and L1 (not L2 or L3)

### Manager (L1) View
- Attendance page: Shows own + team attendance
- Employees page: Shows own profile + direct reports
- Cannot create/edit/delete employees

### Employee (L0) View
- Attendance page: Shows only own records
- Employees page: Shows only own profile
- Can only check-in/check-out
