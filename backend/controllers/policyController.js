import User from '../models/User.js';
import { POLICY_VERSION, REQUIRED_POLICY_IDS, POLICY_KEYS } from '../constants/policies.js';

const buildAcknowledgementUpdate = (acknowledgedAt) => ({
  acknowledged: true,
  acknowledgedAt,
  version: POLICY_VERSION,
});

export const acknowledgePolicies = async (req, res) => {
  try {
    const policies = req.body?.policies || {};
    const missingPolicies = REQUIRED_POLICY_IDS.filter((policyKey) => !policies[policyKey]);

    if (missingPolicies.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All mandatory policies must be acknowledged',
        missingPolicies,
      });
    }

    const acknowledgedAt = new Date();

    const updatePayload = {
      [`policyAcknowledgements.${POLICY_KEYS.TRANSPORT}`]: buildAcknowledgementUpdate(acknowledgedAt),
      [`policyAcknowledgements.${POLICY_KEYS.ATTENDANCE_LEAVE}`]: buildAcknowledgementUpdate(acknowledgedAt),
      'policyAcknowledgements.lastUpdatedAt': acknowledgedAt,
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code')
      .populate('reportingManager', 'firstName lastName employeeId email managementLevel');

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Policy acknowledgment failed:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to record policy acknowledgment',
    });
  }
};
