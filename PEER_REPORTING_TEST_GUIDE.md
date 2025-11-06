# 🧪 Peer Reporting System - Testing Guide

## 🎯 Quick Test Steps

### **Prerequisites**
1. Backend server running on `localhost:5000`
2. Frontend server running on `localhost:3000` (or appropriate port)
3. At least 2 users at the same management level created

---

## 📝 Test Scenario 1: L1 Peer Reporting

### **Step 1: Create Test Users**
Create two L1 Managers who report to the same L2 Senior Manager:

**User A: John (L1 Manager)**
- Management Level: 1 (Manager)
- Reporting Manager: Sarah (L2 Senior Manager)
- Can Approve Leaves: ✅ Yes

**User B: Mike (L1 Manager)**
- Management Level: 1 (Manager)  
- Reporting Manager: Sarah (L2 Senior Manager)
- Can Approve Leaves: ✅ Yes

### **Step 2: Set Up Peer Relationship**
1. Login as John (L1)
2. Go to **Employees** page
3. Edit Mike's profile
4. Set **Reporting Manager** to: John
5. Save changes

**Result**: Mike now reports to John (peer relationship)

---

### **Step 3: Test Manager Dropdown**
1. Login as any employee
2. Go to **Employees** → Edit any employee
3. Click **Reporting Manager** dropdown
4. **✅ Verify**: Both John and Mike appear in the list (peers visible)

---

### **Step 4: Test Employee Visibility**
1. Login as **John**
2. Go to **Employees** page
3. **✅ Verify**: You can see:
   - Yourself (John)
   - Mike (your peer)
   - Any L0 employees who report to you
4. Click on **Mike's row** to view his profile
5. **✅ Verify**: Details modal opens successfully

---

### **Step 5: Test Leave Approval (Peer to Peer)**

#### **5a. Submit Leave Request**
1. Login as **Mike**
2. Go to **Leaves** page
3. Click **Apply Leave**
4. Fill in details:
   - Leave Type: Casual Leave
   - Start Date: Tomorrow
   - End Date: Tomorrow
   - Reason: "Testing peer approval"
5. Submit

#### **5b. Approve Leave Request**
1. Login as **John** (Mike's peer manager)
2. Go to **Leaves** page
3. **✅ Verify**: Mike's leave request appears in the list
4. Click **Approve** button
5. **✅ Verify**: Leave is approved successfully
6. **✅ Verify**: Status changes to "Approved"

---

### **Step 6: Test Attendance Viewing**
1. Login as **John**
2. Go to **Attendance** page
3. Look at the **Employee Filter** dropdown
4. **✅ Verify**: Mike appears in the dropdown
5. Select **Mike** from dropdown
6. **✅ Verify**: Mike's attendance records are visible
7. Try viewing attendance stats
8. **✅ Verify**: No "Not authorized" error

---

### **Step 7: Test Team View**
1. Login as **John**
2. Go to **My Team** page
3. **✅ Verify**: Mike appears in the team members list
4. **✅ Verify**: Mike's info card shows correct details
5. Click on Mike's card (if clickable)
6. **✅ Verify**: Can view team member details

---

## 📝 Test Scenario 2: L0 Peer Reporting

### **Setup**
**User C: Alice (L0 Employee)**
- Management Level: 0 (Employee)
- Reporting Manager: John (L1 Manager)
- Can Approve Leaves: ✅ Yes (Team Lead)

**User D: Bob (L0 Employee)**
- Management Level: 0 (Employee)
- Reporting Manager: John (L1 Manager)
- Can Approve Leaves: ❌ No

### **Configure Peer Relationship**
1. Edit Bob's profile
2. Set Reporting Manager to: Alice
3. Save

**Result**: Bob now reports to Alice (L0 peer)

---

### **Test L0 Peer Leave Approval**
1. Login as **Bob**
2. Apply for leave (1 day, Casual Leave)
3. Logout and login as **Alice**
4. Go to **Leaves** page
5. **✅ Verify**: Bob's leave request is visible
6. Click **Approve**
7. **✅ Verify**: Approval succeeds (Alice has canApproveLeaves permission)

---

## 📝 Test Scenario 3: L2 Peer Reporting

### **Setup**
**User E: Sarah (L2 Senior Manager)**
- Management Level: 2
- Reporting Manager: David (L3 Admin)

**User F: Tom (L2 Senior Manager)**
- Management Level: 2
- Reporting Manager: David (L3 Admin)

### **Configure**
1. Edit Tom's profile
2. Set Reporting Manager to: Sarah
3. Save

### **Test L2 Peer Features**
1. Login as **Sarah**
2. Navigate to **Employees**
3. **✅ Verify**: Tom is visible in employee list
4. Go to **Leaves**
5. Have Tom submit a leave request
6. Login as **Sarah** again
7. **✅ Verify**: Tom's leave appears
8. Approve the leave
9. **✅ Verify**: Approval succeeds

---

## 🚫 Negative Test Cases

### **Test 1: Cross-Level Blocking**
1. Create L0 employee (Alice) with `canApproveLeaves: true`
2. Have L1 manager (John) submit leave
3. Login as Alice (L0)
4. Try to approve John's leave
5. **✅ Verify**: Error: "Level 0 employees can only approve leaves for Level 0 peers"

### **Test 2: No Permission Blocking**
1. Create L0 employee (Charlie) with `canApproveLeaves: false`
2. Have peer L0 (Bob) submit leave
3. Login as Charlie
4. Try to approve Bob's leave
5. **✅ Verify**: Error: "Not authorized to approve leaves"

### **Test 3: Non-Peer Blocking**
1. Create two L1 managers with DIFFERENT reporting managers
2. Have one submit a leave
3. Login as the other
4. Try to approve the leave
5. **✅ Verify**: Error: "You can only approve leaves for your direct reports or peers who report to you"

---

## 📊 Expected Results Summary

| Feature | Expected Behavior |
|---------|------------------|
| **Manager Dropdown** | Shows managers (L1+) AND same-level peers |
| **Employee List** | Shows self + direct reports + peers (same level, same RM) |
| **Leave Approval** | Works for peers IF reportingManager relationship exists |
| **Attendance View** | Peers' attendance visible in list and stats |
| **Team View** | Peers appear in "My Team" section |
| **Permissions** | `canApproveLeaves` still required for approvals |
| **Cross-Level Block** | L0 cannot approve L1+ leaves, even with permission |

---

## 🐛 Common Issues & Solutions

### **Issue 1: Peer not visible in employee list**
- **Check**: Both users have same `managementLevel`
- **Check**: Both users have same `reportingManager`
- **Solution**: Update reporting manager or level to match

### **Issue 2: Cannot approve peer's leave**
- **Check**: `canApproveLeaves` permission is true
- **Check**: Peer has `reportingManager` set to current user
- **Check**: Same management level
- **Solution**: Verify reportingManager relationship exists

### **Issue 3: Peer not in manager dropdown**
- **Check**: Backend `getManagers()` function updated
- **Check**: Frontend calling correct API endpoint
- **Solution**: Verify query includes `$or` condition for same level

---

## ✅ Success Criteria

All tests pass when:
- ✅ Peers visible in all relevant lists (employees, team, dropdowns)
- ✅ Leave approval works for peer relationships
- ✅ Attendance access works for peers
- ✅ Permissions still enforced (`canApproveLeaves` required)
- ✅ Cross-level approvals still blocked
- ✅ No console errors or API failures
- ✅ Existing hierarchical reporting still works

---

## 📸 What to Look For

### **Visual Checks**
1. **Employee Table**: Row count increases when peers are added
2. **Manager Dropdown**: List includes both managers and peers
3. **Leave List**: Shows leaves from peers in same table as direct reports
4. **Team Cards**: Peer cards appear with correct info
5. **Attendance Table**: Peer attendance records visible

### **Console Logs** (Backend)
```
🔒 L0 Employee: Own + peers + direct reports
👔 L1 Manager: Can view team X members + Y peers
🎯 L2 Senior Manager: Can view X managers, their teams + Y peers
```

---

## 🎉 Testing Complete

Once all scenarios pass:
- ✅ Peer reporting is fully functional
- ✅ All access controls working correctly
- ✅ System is production-ready

**Happy Testing!** 🚀
