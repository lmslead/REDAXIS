# Sensitive Data Access Control Implementation

## Overview
This document describes the implementation of access control for sensitive employee data in the HRMS system. The implementation ensures that sensitive financial and identity information is only accessible to authorized Finance department users at L3 and L4 management levels.

## Sensitive Data Fields
The following employee fields are considered sensitive and require special access permissions:

### Financial Information
- **Salary Details**: `salary.grossSalary`
- **Bank Details**: 
  - `bankDetails.accountNumber`
  - `bankDetails.bankName`
  - `bankDetails.ifscCode`

### Compliance Information
- **Compliance Details**:
  - `complianceDetails.uanNumber`
  - `complianceDetails.pfNumber`
  - `complianceDetails.esiNumber`

### Identity Documents
- **PAN Card**: `panCard`
- **Aadhar Card**: `aadharCard`

## Access Control Rules

### During Employee Onboarding (Creation)
- **Who can create employees**: L2 (Senior Manager), L3 (Admin), and L4 (CEO)
- **Sensitive data entry**: All authorized users (L2+) can fill in sensitive data during employee creation
- **Purpose**: This allows HR and management to complete the onboarding process with all necessary information

### After Employee Creation (Viewing/Editing)
- **Who can view sensitive data**: 
  - ✅ L4 (CEO/Owner) - Full access to all data
  - ✅ L3 (Admin) from Finance Department only
  - ❌ L3 from other departments - No access
  - ❌ L2 (Senior Manager) - No access
  - ❌ L1 (Manager) - No access
  - ❌ L0 (Employee) - No access

- **Who can edit sensitive data**: Same as viewing permissions (Finance L3/L4 only)

## Technical Implementation

### Backend Changes

#### 1. Helper Function (`employeeController.js`)
```javascript
const checkCanViewSensitiveData = async (user) => {
  if (!user) return false;
  
  const userLevel = user.managementLevel || 0;
  
  // L4 (CEO) has full access
  if (userLevel === 4) return true;
  
  // L3 must be in Finance department
  if (userLevel === 3) {
    const userWithDept = await User.findById(user.id).populate('department');
    return userWithDept?.department?.name === 'Finance';
  }
  
  return false;
};
```

#### 2. Get All Employees (`GET /api/employees`)
- Filters sensitive data from response for non-authorized users
- Returns `canViewSensitiveData` flag to frontend
- Maintains existing hierarchy-based access control (L0-L4 visibility rules)

#### 3. Get Single Employee (`GET /api/employees/:id`)
- Filters sensitive data for non-authorized users
- Returns `canViewSensitiveData` flag
- Allows employee profile viewing while protecting sensitive information

#### 4. Create Employee (`POST /api/employees`)
- Allows all L2+ users to add sensitive data during creation
- Logs when sensitive data is included during onboarding
- No restrictions during initial employee setup

#### 5. Update Employee (`PUT /api/employees/:id`)
- **Strips sensitive fields** from update request if user lacks permission
- Only Finance L3/L4 can update: `salary`, `bankDetails`, `complianceDetails`, `panCard`, `aadharCard`
- Other users can update non-sensitive fields normally
- Logs access attempts for security audit

### Frontend Changes (`Employees.jsx`)

#### 1. Permission State Management
```javascript
const [canViewSensitiveData, setCanViewSensitiveData] = useState(false);
```

#### 2. Fetch Permissions
```javascript
const fetchEmployees = async () => {
  const response = await employeesAPI.getAll();
  setEmployees(response.data);
  setCanViewSensitiveData(response.canViewSensitiveData);
};
```

#### 3. Conditional Form Rendering
Sensitive sections are:
- **Shown** during new employee creation (all L2+ users)
- **Shown** during editing only if `canViewSensitiveData === true`
- **Hidden** completely for non-authorized users when editing

#### 4. Visual Indicators
- Badge shows "Finance Only" or "Restricted" for non-authorized users
- Warning messages explain access requirements
- Disabled input fields when permission is denied

#### 5. Form Sections with Access Control
- Identity Documents section
- Salary Information section
- Banking Details section
- Compliance Details section

## User Experience

### For Authorized Users (Finance L3/L4)
- ✅ Can view all employee data including sensitive information
- ✅ Can edit all fields during employee creation and updates
- ✅ Full visibility in employee list and detail views

### For Non-Authorized Users (L2, Non-Finance L3)
- ✅ Can add employees with complete information during onboarding
- ✅ Can view non-sensitive employee information
- ✅ Can edit non-sensitive fields (name, department, position, etc.)
- ❌ Cannot view sensitive data after employee creation
- ❌ Cannot edit sensitive data after employee creation
- ℹ️ See clear indicators when fields are restricted

### For Employees (L0/L1)
- Limited to viewing their own profile (existing L0 restriction)
- Cannot access sensitive data even in their own profile

## Security Features

### Data Protection
1. **Backend Filtering**: Sensitive data removed at API level before sending response
2. **Permission Validation**: Every request validates user's department and level
3. **Update Protection**: Sensitive field updates automatically blocked for unauthorized users
4. **Audit Trail**: All access and modification attempts are logged

### Department Validation
- System specifically checks for "Finance" department by name
- Case-sensitive department name matching
- Requires user's department to be populated from database

### Management Level Validation
- L4 (CEO) - Unrestricted access
- L3 (Admin) - Department-specific access (Finance only)
- L2 and below - No access to sensitive data post-creation

## Testing Scenarios

### Scenario 1: HR Manager Creates Employee
1. HR Manager (L2, HR Department) logs in
2. Opens "Add Employee" form
3. Fills all fields including salary, bank details, PAN, Aadhar
4. ✅ Employee created successfully with all sensitive data

### Scenario 2: HR Manager Edits Employee
1. HR Manager tries to edit existing employee
2. Sensitive sections are NOT visible in edit form
3. Can only modify basic information
4. ✅ Update saves successfully (sensitive data unchanged)

### Scenario 3: Finance Admin Views Employee
1. Finance Admin (L3, Finance Department) logs in
2. Opens employee detail/edit form
3. ✅ All sensitive fields are visible
4. ✅ Can modify all fields including salary and bank details

### Scenario 4: Non-Finance Admin Views Employee
1. Admin (L3, HR Department) logs in
2. Opens employee detail/edit form
3. ❌ Sensitive sections are hidden
4. Can only view/edit non-sensitive information

### Scenario 5: CEO Access
1. CEO (L4) logs in
2. ✅ Full access to all employee data
3. ✅ Can view and edit everything regardless of department

## API Response Examples

### With Sensitive Data Access (Finance L3/L4)
```json
{
  "success": true,
  "data": {
    "employeeId": "EMP001",
    "firstName": "John",
    "salary": { "grossSalary": 75000 },
    "bankDetails": { 
      "accountNumber": "1234567890",
      "bankName": "State Bank",
      "ifscCode": "SBIN0001234"
    },
    "complianceDetails": {
      "uanNumber": "123456789012",
      "pfNumber": "PF123456",
      "esiNumber": "ESI789012"
    },
    "panCard": "ABCDE1234F",
    "aadharCard": "123456789012"
  },
  "canViewSensitiveData": true
}
```

### Without Sensitive Data Access (Non-Finance Users)
```json
{
  "success": true,
  "data": {
    "employeeId": "EMP001",
    "firstName": "John",
    "department": "Engineering",
    "position": "Software Engineer"
    // salary, bankDetails, complianceDetails, panCard, aadharCard removed
  },
  "canViewSensitiveData": false
}
```

## Configuration Requirements

### Database Requirements
1. Finance department must exist in the `departments` collection
2. Department name must be exactly "Finance" (case-sensitive)
3. Users must have their `department` field properly populated

### User Requirements
1. Users must have `managementLevel` field set (0-4)
2. Finance department users must be assigned to Finance department
3. L4 users can be in any department (unrestricted access)

## Troubleshooting

### Issue: Finance L3 User Cannot See Sensitive Data
**Check:**
- Is the user's `managementLevel` exactly 3?
- Is the user's `department` field populated?
- Is the department name exactly "Finance"?
- Run this query to verify:
  ```javascript
  db.users.findOne({ _id: "userId" }).department
  ```

### Issue: Sensitive Data Still Visible to Non-Finance Users
**Check:**
- Backend API is returning `canViewSensitiveData: false`
- Frontend is correctly reading the permission flag
- Browser cache is cleared
- User has logged out and back in

### Issue: Cannot Create Employee with Sensitive Data
**Check:**
- User's management level is L2 or higher
- No error in browser console
- Backend is accepting the creation request
- Review backend logs for validation errors

## Maintenance Notes

### Adding New Sensitive Fields
1. Add field to User model
2. Update `getEmployees` and `getEmployee` to filter the field
3. Update `updateEmployee` to block unauthorized updates
4. Update frontend conditional rendering
5. Update this documentation

### Changing Department Name
If the Finance department is renamed:
1. Update `checkCanViewSensitiveData` function
2. Update department name check in helper function
3. Test all access scenarios

### Adding More Authorized Departments
To allow multiple departments (e.g., Finance and HR):
```javascript
const authorizedDepartments = ['Finance', 'HR'];
return authorizedDepartments.includes(userWithDept?.department?.name);
```

## Compliance and Audit

### Data Privacy
- Sensitive financial data is protected per data privacy regulations
- Access is role-based and auditable
- No sensitive data in API logs

### Audit Trail
- All access to sensitive data is logged with user ID and level
- Update attempts are logged with success/failure status
- Logs include timestamp and operation type

### Recommendations
1. Regular audit of Finance department users
2. Periodic review of access logs
3. Ensure department assignments are accurate
4. Train Finance staff on data handling procedures

## Future Enhancements

### Potential Improvements
1. **Field-level permissions**: Different permissions for different sensitive fields
2. **Temporary access**: Time-limited access grants for specific users
3. **Approval workflow**: Require approval to view sensitive data
4. **Encryption**: Additional encryption layer for stored sensitive data
5. **Access logs UI**: Dashboard for viewing who accessed what data
6. **Multi-department access**: Allow configuration of multiple authorized departments

---

**Implementation Date**: November 6, 2025  
**Version**: 1.0  
**Last Updated**: November 6, 2025
