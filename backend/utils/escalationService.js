import Leave from '../models/Leave.js';
import User from '../models/User.js';

/**
 * Check for pending leaves that have exceeded the approval deadline
 * and escalate them to the next level (L2 or L3)
 * 
 * This function should be run as a cron job every few hours
 */
export const checkAndEscalateLeaves = async () => {
  try {
    console.log('🔍 Checking for leaves that need escalation...');
    
    const now = new Date();
    
    // Find pending leaves that are past their deadline and not yet escalated
    const overdueLeaves = await Leave.find({
      status: 'pending',
      isEscalated: false,
      approvalDeadline: { $lt: now }
    })
    .populate('employee', 'firstName lastName employeeId reportingManager')
    .populate('currentApprover', 'firstName lastName reportingManager managementLevel');

    if (overdueLeaves.length === 0) {
      console.log('✅ No leaves need escalation at this time');
      return { escalated: 0, message: 'No leaves need escalation' };
    }

    console.log(`⚠️  Found ${overdueLeaves.length} leaves needing escalation`);

    const escalatedLeaves = [];
    const errors = [];

    for (const leave of overdueLeaves) {
      try {
        // Determine who to escalate to
        let escalateTo = null;

        if (leave.currentApprover) {
          // Escalate to current approver's manager
          const currentApprover = await User.findById(leave.currentApprover._id);
          
          if (currentApprover && currentApprover.reportingManager) {
            escalateTo = currentApprover.reportingManager;
          } else {
            // If current approver has no manager, escalate to Level 3 admin
            const admin = await User.findOne({ managementLevel: 3, isActive: true });
            escalateTo = admin ? admin._id : null;
          }
        } else {
          // No current approver, find employee's reporting manager's manager
          if (leave.employee.reportingManager) {
            const rm = await User.findById(leave.employee.reportingManager);
            if (rm && rm.reportingManager) {
              escalateTo = rm.reportingManager;
            } else {
              // Escalate to Level 3 admin
              const admin = await User.findOne({ managementLevel: 3, isActive: true });
              escalateTo = admin ? admin._id : null;
            }
          }
        }

        if (!escalateTo) {
          console.log(`⚠️  Cannot escalate leave ${leave._id} - no escalation target found`);
          errors.push({
            leaveId: leave._id,
            error: 'No escalation target found'
          });
          continue;
        }

        // Update the leave with escalation info
        leave.isEscalated = true;
        leave.escalationDate = new Date();
        leave.escalatedTo = escalateTo;
        leave.currentApprover = escalateTo;
        leave.approvalLevel = leave.approvalLevel + 1;
        
        // Extend deadline by another 24 hours
        leave.approvalDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Add to approval history
        leave.approvalHistory.push({
          approver: escalateTo,
          action: 'escalated',
          date: new Date(),
          remarks: `Automatically escalated due to approval deadline exceeded`,
          level: leave.approvalLevel
        });

        await leave.save();

        escalatedLeaves.push({
          leaveId: leave._id,
          employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`,
          escalatedTo: escalateTo
        });

        console.log(`✅ Escalated leave ${leave._id} to ${escalateTo}`);

        // TODO: Send notification to escalatedTo user
        
      } catch (error) {
        console.error(`❌ Error escalating leave ${leave._id}:`, error);
        errors.push({
          leaveId: leave._id,
          error: error.message
        });
      }
    }

    const result = {
      checked: overdueLeaves.length,
      escalated: escalatedLeaves.length,
      failed: errors.length,
      escalatedLeaves,
      errors
    };

    console.log(`✅ Escalation check complete: ${escalatedLeaves.length} escalated, ${errors.length} failed`);
    
    return result;
  } catch (error) {
    console.error('❌ Error in escalation check:', error);
    throw error;
  }
};

/**
 * Manual endpoint to trigger escalation check
 * Can be called via API: POST /api/leaves/check-escalations
 */
export const triggerEscalationCheck = async (req, res) => {
  try {
    // Only admin or HR can manually trigger escalation checks
    if (req.user.managementLevel !== 3) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to trigger escalation checks'
      });
    }

    const result = await checkAndEscalateLeaves();

    res.json({
      success: true,
      message: 'Escalation check completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Set up automatic escalation check (call this when server starts)
 * Checks every 6 hours
 */
export const setupEscalationCron = () => {
  // Run check every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  // Run immediately on startup
  setTimeout(() => {
    checkAndEscalateLeaves();
  }, 5000); // Wait 5 seconds after server start

  // Then run every 6 hours
  setInterval(() => {
    checkAndEscalateLeaves();
  }, SIX_HOURS);

  console.log('✅ Escalation cron job scheduled (every 6 hours)');
};
