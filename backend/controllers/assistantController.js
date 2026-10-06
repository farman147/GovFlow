import { processAssistantQuery, getProactiveInsights } from '../services/aiAssistantService.js';

export const queryAssistant = async (req, res, next) => {
  try {
    const { query, serviceId } = req.body;
    const citizenId = req.user?._id || null;

    const result = await processAssistantQuery({
      query,
      serviceId,
      citizenId
    });

    res.status(200).json({
      success: true,
      message: 'AI Assistant response generated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAssistantInsights = async (req, res, next) => {
  try {
    const insights = await getProactiveInsights();
    res.status(200).json({
      success: true,
      message: 'AI Assistant insights retrieved',
      data: insights
    });
  } catch (error) {
    next(error);
  }
};
