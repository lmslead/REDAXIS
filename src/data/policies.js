export const POLICY_RELEASE_VERSION = '2025-11-01';

export const POLICY_DOCUMENTS = [
  {
    id: 'transport-policy',
    key: 'transportPolicy',
    tag: 'Mobility & Safety',
    title: 'Transport Policy',
    summary:
      'Guidelines for using company-arranged transportation so every shift begins with a safe, punctual, and disciplined commute.',
    effectiveDate: 'Nov 1, 2025',
    owner: 'Administration Department',
    approvers: ['Jyotsana Bora (CHRO)', 'Vishal Bora (CEO)'],
    keyHighlights: [
      { label: 'Arrival Buffer', value: 'Reach 5 minutes before pick-up' },
      { label: 'Cancellation SLA', value: 'Cancel ≥1 hour before shift' },
      { label: 'ID Check', value: 'Carry company ID at all times' },
    ],
    sections: [
      {
        title: 'Eligibility',
        items: [
          'Employees working in designated shifts, or those explicitly approved by management, may opt for company transport.',
        ],
      },
      {
        title: 'Pick-Up & Drop-Off',
        items: [
          'Be present at the pick-up point at least 5 minutes before the scheduled time; drivers leave strictly on schedule.',
          'Drivers will not wait beyond the planned pick-up time; late arrivals must arrange their own commute.',
          'Pick-up or drop location changes require 24-hours prior notice along with Administration approval.',
        ],
      },
      {
        title: 'Attendance & Leave Coordination',
        items: [
          'Cancel transport at least 1 hour before shift start whenever you are on leave or not reporting to work.',
          'Failure to cancel on time can trigger transport charges in line with company policy.',
        ],
      },
      {
        title: 'Safety Rules',
        items: [
          'No standing, shouting, or distracting the driver during transit.',
          'Alcohol consumption or smoking inside the vehicle is strictly prohibited.',
          'Carry your company-issued ID card for every ride.',
          'Once you board for a shift, remain seated until the bus reaches the designated destination.',
        ],
      },
      {
        title: 'Conduct & Discipline',
        items: [
          'Treat drivers and fellow passengers with respect; misconduct leads to disciplinary action.',
          'Any intentional or unintentional damage to the vehicle may lead to penalties.',
        ],
      },
      {
        title: 'Tracking & Communication',
        items: [
          'Keep your phone reachable during transport hours for coordination.',
          'Inform the transport coordinator immediately in case of delays or emergencies.',
        ],
      },
      {
        title: 'Company Rights',
        items: [
          'The company may modify or withdraw transport facilities at any time based on operational needs.',
        ],
      },
    ],
    alerts: [
      {
        tone: 'warning',
        title: 'Discipline Reminder',
        description:
          'Misbehavior with the driver or passengers, or damaging the vehicle, invites immediate disciplinary inquiry.',
      },
      {
        tone: 'info',
        title: 'Need Help?',
        description:
          'Reach out to the transport coordinator or Administration Department for schedule clarifications or emergencies.',
      },
    ],
  },
  {
    id: 'attendance-leave-policy',
    key: 'attendanceLeavePolicy',
    tag: 'Workforce Operations',
    title: 'Attendance & Leave Policy',
    summary:
      'Defines attendance expectations, leave workflows, incentives, and deductions to preserve discipline and client commitments.',
    effectiveDate: 'Nov 1, 2025',
    owner: 'Human Resources Department',
    approvers: ['Jyotsana Bora (CHRO)', 'Vishal Bora (CEO)'],
    keyHighlights: [
      { label: 'Attendance Bonus', value: 'INR 1,500 for 100% monthly attendance' },
      { label: 'Double Pay Cut', value: 'Applies for leave on Monday + Friday/Saturday' },
      { label: 'NCNS Rule', value: 'No call, no show triggers disciplinary action' },
    ],
    sections: [
      {
        title: 'Applicability & Objective',
        items: [
          'Applies to all employees, including probationers, across every department and shift.',
          'Ensures discipline, transparency, and consistent service levels through accurate attendance capture.',
        ],
      },
      {
        title: 'Attendance Guidelines',
        items: [
          'Follow your assigned shift schedule and maintain punctual logins/logouts via the official attendance system.',
          'Attendance is tracked digitally every working day; ensure records reflect the actual working pattern.',
        ],
      },
      {
        title: 'Attendance Bonus',
        items: [
          'Employees with 100% attendance in a calendar month (no approved or unapproved leave) receive an INR 1,500 bonus.',
          'Any type of leave—irrespective of approval status—makes the employee ineligible for that month’s bonus.',
        ],
      },
      {
        title: 'Leave Policy',
        items: [
          {
            text: 'Approved Leave',
            subItems: [
              'Granted against available Privilege Leave (PL), Casual Leave (CL), or Sick Leave (SL) as per company rules.',
              'Only confirmed employees can avail PL, CL, and SL.',
              'Submit leave requests in advance via official email to the Team Leader and Operations Manager, copying BHR and Payroll.',
            ],
          },
          {
            text: 'Probationary Employees',
            subItems: ['All absences are treated as Leave Without Pay (LWP) during probation, regardless of the reason.'],
          },
          {
            text: 'Unapproved Leave',
            subItems: ['Any unapproved absence—confirmed or probationary—counts as Leave Without Pay (LWP).'],
          },
        ],
      },
      {
        title: 'No Call, No Show (NCNS)',
        items: [
          'Failure to inform the reporting manager or team leader before shift start is treated as NCNS.',
          'Repeated NCNS instances trigger disciplinary action.',
        ],
      },
      {
        title: 'Attendance Calculation for Payroll',
        table: {
          columns: ['Status', 'Description', 'Pay Impact'],
          rows: [
            {
              status: 'Full Day Present',
              description: 'Worked more than 7.5 hours (excluding breaks)',
              impact: 'Full-day pay',
            },
            {
              status: 'Half Day',
              description: 'Worked less than 5.5 hours (excluding breaks)',
              impact: 'Half-day pay',
            },
            {
              status: 'Absent / LWP',
              description: 'No login or unapproved leave recorded',
              impact: 'No pay',
            },
          ],
        },
        note: 'Break durations are excluded from total working hours when determining daily status.',
      },
      {
        title: 'Updated Leave Controls',
        items: [
          'Double-day pay cut applies when leave is taken on the first day (Monday) and the last day (Friday/Saturday) of the same week.',
          'Late reporting can be marked as half-day entirely at Operations’ discretion.',
        ],
      },
      {
        title: 'General Conditions',
        items: [
          'Attendance and leave records remain subject to HR and Operations review.',
          'Any falsification or misuse of attendance data triggers disciplinary proceedings.',
          'The company may modify or update the policy whenever operational requirements demand.',
        ],
      },
    ],
    alerts: [
      {
        tone: 'success',
        title: 'Stay Bonus-Ready',
        description:
          'Plan time off carefully so you can unlock the monthly attendance incentive without disrupting coverage.',
      },
      {
        tone: 'warning',
        title: 'NCNS Impact',
        description:
          'Repeated NCNS is escalated to HR for disciplinary action and can affect employment status.',
      },
    ],
  },
];
