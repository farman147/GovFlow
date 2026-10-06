import { readFile } from 'fs/promises';

const PREDICTION_FILE = new URL('../data/govflow_predictions.json', import.meta.url);

const codeAliases = {
  'DRIVING LICENSE RENEWAL': 'RTO',
  'DRIVING LICENSE': 'RTO',
  'DRIVING LICENCE': 'RTO',
  'DRIVING LICENCE RENEWAL': 'RTO',
  'LICENSE': 'RTO',
  'LICENCE': 'RTO',
  'DL': 'RTO',
  'DLR': 'RTO',
  'RTO': 'RTO',
  'VEHICLE REGISTRATION': 'VEH',
  'VEHICLE': 'VEH',
  'RC': 'VEH',
  'VEH': 'VEH',
  'BIRTH CERTIFICATE': 'BIRTH',
  'BIRTH': 'BIRTH',
  'INCOME CERTIFICATE': 'INC',
  'INCOME': 'INC',
  'INC': 'INC',
  'LAND RECORD REQUEST': 'LAND',
  'LAND RECORD': 'LAND',
  'LAND': 'LAND',
};

const loadPredictions = async () => {
  const fileContents = await readFile(PREDICTION_FILE, 'utf8');
  return JSON.parse(fileContents);
};

export const listPredictions = async (req, res, next) => {
  try {
    const predictions = await loadPredictions();
    res.status(200).json({
      success: true,
      message: 'Predictions retrieved',
      data: predictions,
    });
  } catch (error) {
    next(error);
  }
};

export const getPredictionByService = async (req, res, next) => {
  try {
    const { serviceType } = req.params;
    const cleanQuery = String(serviceType || '').trim().toUpperCase();
    const resolvedCode = codeAliases[cleanQuery] || cleanQuery;

    const predictions = await loadPredictions();
    const match = predictions.find(
      (prediction) =>
        String(prediction.service_type).toUpperCase() === resolvedCode ||
        String(prediction.service_type).toUpperCase() === cleanQuery
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: `No predictions found for service type: ${serviceType}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prediction retrieved',
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

