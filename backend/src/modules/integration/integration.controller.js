import { IntegrationHandoff, HANDOFF_STATUS } from '../../models/integrationHandoff.model.js';
import { reconcilePendingHandoffs } from './handoffService.js';
import env from '../../config/env.js';

export async function getIntegrationStatus(req, res, next) {
  try {
    const [total, delivered, retrying, failed] = await Promise.all([
      IntegrationHandoff.countDocuments(),
      IntegrationHandoff.countDocuments({ deliveryStatus: HANDOFF_STATUS.DELIVERED }),
      IntegrationHandoff.countDocuments({ deliveryStatus: HANDOFF_STATUS.RETRYING }),
      IntegrationHandoff.countDocuments({ deliveryStatus: HANDOFF_STATUS.FAILED })
    ]);

    const recentHandoffs = await IntegrationHandoff.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('candidateEmail candidateName internshipReference deliveryStatus retryCount lastError createdAt deliveredAt')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        service: 'ashivam-website',
        targetService: 'ashivam-internship',
        targetUrl: env.internshipServiceUrl,
        metrics: {
          total,
          delivered,
          retrying,
          failed,
          deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 100
        },
        recentHandoffs
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function triggerReconciliation(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const summary = await reconcilePendingHandoffs(limit);

    return res.status(200).json({
      success: true,
      message: 'Integration reconciliation process completed',
      data: summary
    });
  } catch (err) {
    next(err);
  }
}
