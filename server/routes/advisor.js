const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Crop advisor data (in a real app, this would be in a database or AI service)
const cropDatabase = {
  'rice': {
    seasons: ['kharif'],
    soilTypes: ['clay', 'loamy', 'alluvial'],
    regions: ['punjab', 'haryana', 'west bengal', 'uttar pradesh', 'andhra pradesh'],
    fertilizers: ['urea', 'dap', 'potash', 'zinc sulfate'],
    waterRequirement: 'high',
    duration: '120-150 days',
    yield: '40-50 quintals/hectare',
    tips: [
      'Maintain 2-3 inches of water in the field',
      'Apply nitrogen in 3 splits',
      'Use certified seeds for better yield'
    ]
  },
  'wheat': {
    seasons: ['rabi'],
    soilTypes: ['loamy', 'clay', 'alluvial'],
    regions: ['punjab', 'haryana', 'uttar pradesh', 'madhya pradesh', 'rajasthan'],
    fertilizers: ['urea', 'dap', 'mop', 'zinc sulfate'],
    waterRequirement: 'medium',
    duration: '120-140 days',
    yield: '35-45 quintals/hectare',
    tips: [
      'Sow at the right time (November-December)',
      'Maintain proper plant population',
      'Apply pre-sowing irrigation'
    ]
  },
  'cotton': {
    seasons: ['kharif'],
    soilTypes: ['black', 'alluvial', 'red'],
    regions: ['gujarat', 'maharashtra', 'telangana', 'andhra pradesh', 'punjab'],
    fertilizers: ['urea', 'dap', 'mop', 'boron'],
    waterRequirement: 'medium',
    duration: '180-200 days',
    yield: '15-20 quintals/hectare',
    tips: [
      'Use Bt cotton varieties for pest resistance',
      'Maintain proper spacing between plants',
      'Monitor for pink bollworm'
    ]
  },
  'sugarcane': {
    seasons: ['year_round'],
    soilTypes: ['loamy', 'clay', 'alluvial'],
    regions: ['uttar pradesh', 'maharashtra', 'karnataka', 'tamil nadu', 'punjab'],
    fertilizers: ['urea', 'dap', 'mop', 'zinc sulfate'],
    waterRequirement: 'high',
    duration: '12-18 months',
    yield: '700-900 quintals/hectare',
    tips: [
      'Plant disease-free setts',
      'Apply organic matter regularly',
      'Maintain proper irrigation schedule'
    ]
  },
  'maize': {
    seasons: ['kharif', 'rabi'],
    soilTypes: ['loamy', 'alluvial', 'red'],
    regions: ['karnataka', 'andhra pradesh', 'bihar', 'uttar pradesh', 'rajasthan'],
    fertilizers: ['urea', 'dap', 'mop', 'zinc sulfate'],
    waterRequirement: 'medium',
    duration: '90-120 days',
    yield: '25-35 quintals/hectare',
    tips: [
      'Use hybrid varieties for better yield',
      'Apply nitrogen in splits',
      'Control stem borer and fall armyworm'
    ]
  },
  'tomato': {
    seasons: ['rabi', 'summer'],
    soilTypes: ['loamy', 'sandy loam', 'well-drained'],
    regions: ['karnataka', 'andhra pradesh', 'maharashtra', 'gujarat', 'haryana'],
    fertilizers: ['urea', 'dap', 'mop', 'calcium nitrate'],
    waterRequirement: 'medium',
    duration: '120-140 days',
    yield: '400-600 quintals/hectare',
    tips: [
      'Use drip irrigation for water efficiency',
      'Provide support to plants',
      'Monitor for early and late blight'
    ]
  },
  'potato': {
    seasons: ['rabi'],
    soilTypes: ['sandy loam', 'loamy', 'well-drained'],
    regions: ['uttar pradesh', 'punjab', 'bihar', 'gujarat', 'madhya pradesh'],
    fertilizers: ['urea', 'dap', 'mop', 'sulfur'],
    waterRequirement: 'medium',
    duration: '90-120 days',
    yield: '200-300 quintals/hectare',
    tips: [
      'Use certified seed potatoes',
      'Maintain proper earthing up',
      'Control late blight disease'
    ]
  }
};

// Get crop recommendations
router.post('/recommend', authenticateToken, [
  body('soilType').isIn(['clay', 'loamy', 'sandy', 'black', 'red', 'alluvial', 'sandy loam', 'well-drained']).withMessage('Valid soil type required'),
  body('region').trim().notEmpty().withMessage('Region is required'),
  body('season').isIn(['kharif', 'rabi', 'summer', 'year_round']).withMessage('Valid season required'),
  body('farmSize').isFloat({ min: 0.1 }).withMessage('Farm size must be positive'),
  body('budget').optional().isFloat({ min: 0 }),
  body('experience').optional().isIn(['beginner', 'intermediate', 'expert']),
  body('waterAvailability').optional().isIn(['low', 'medium', 'high'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { soilType, region, season, farmSize, budget, experience = 'intermediate', waterAvailability = 'medium' } = req.body;

    // Find suitable crops based on input parameters
    const suitableCrops = [];
    
    Object.entries(cropDatabase).forEach(([cropName, cropData]) => {
      let score = 0;
      let reasons = [];

      // Check soil compatibility
      if (cropData.soilTypes.includes(soilType)) {
        score += 30;
        reasons.push(`Suitable for ${soilType} soil`);
      }

      // Check region compatibility
      const regionLower = region.toLowerCase();
      if (cropData.regions.some(r => r.includes(regionLower) || regionLower.includes(r))) {
        score += 25;
        reasons.push(`Grown successfully in ${region}`);
      }

      // Check season compatibility
      if (cropData.seasons.includes(season)) {
        score += 25;
        reasons.push(`Perfect for ${season} season`);
      }

      // Water requirement compatibility
      const waterScore = {
        'low': { 'low': 20, 'medium': 10, 'high': 0 },
        'medium': { 'low': 15, 'medium': 20, 'high': 15 },
        'high': { 'low': 0, 'medium': 15, 'high': 20 }
      };
      
      if (waterScore[cropData.waterRequirement] && waterScore[cropData.waterRequirement][waterAvailability]) {
        score += waterScore[cropData.waterRequirement][waterAvailability];
        reasons.push(`Water requirement matches availability`);
      }

      // Only include crops with reasonable compatibility
      if (score >= 50) {
        suitableCrops.push({
          name: cropName,
          score,
          reasons,
          details: {
            ...cropData,
            estimatedCost: calculateEstimatedCost(cropName, farmSize),
            estimatedRevenue: calculateEstimatedRevenue(cropName, farmSize),
            riskLevel: calculateRiskLevel(cropName, experience, region)
          }
        });
      }
    });

    // Sort by score (best matches first)
    suitableCrops.sort((a, b) => b.score - a.score);

    // Limit to top 5 recommendations
    const recommendations = suitableCrops.slice(0, 5);

    // Add general farming tips based on input
    const generalTips = generateGeneralTips(soilType, season, region, experience);

    res.json({
      recommendations,
      generalTips,
      inputParameters: {
        soilType,
        region,
        season,
        farmSize,
        budget,
        experience,
        waterAvailability
      },
      disclaimer: 'These recommendations are based on general agricultural practices. Please consult with local agricultural experts for specific advice.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get crop recommendations', error: error.message });
  }
});

// Get fertilizer recommendations for a specific crop
router.post('/fertilizer', authenticateToken, [
  body('crop').trim().notEmpty().withMessage('Crop name is required'),
  body('soilType').isIn(['clay', 'loamy', 'sandy', 'black', 'red', 'alluvial', 'sandy loam', 'well-drained']).withMessage('Valid soil type required'),
  body('farmSize').isFloat({ min: 0.1 }).withMessage('Farm size must be positive'),
  body('soilTestResults').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { crop, soilType, farmSize, soilTestResults } = req.body;
    const cropLower = crop.toLowerCase();

    if (!cropDatabase[cropLower]) {
      return res.status(404).json({ message: 'Crop not found in database' });
    }

    const cropData = cropDatabase[cropLower];
    
    // Generate fertilizer schedule
    const fertilizerSchedule = generateFertilizerSchedule(cropLower, farmSize, soilType, soilTestResults);
    
    // Calculate total fertilizer cost
    const totalCost = fertilizerSchedule.reduce((sum, stage) => {
      return sum + stage.fertilizers.reduce((stageSum, fert) => stageSum + fert.cost, 0);
    }, 0);

    res.json({
      crop: cropLower,
      farmSize,
      soilType,
      fertilizerSchedule,
      totalCost,
      recommendations: [
        'Always conduct soil testing before fertilizer application',
        'Apply fertilizers based on crop growth stages',
        'Consider organic alternatives for soil health',
        'Monitor crop response and adjust accordingly'
      ],
      organicAlternatives: getOrganicAlternatives(cropLower)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get fertilizer recommendations', error: error.message });
  }
});

// Get pest and disease management advice
router.post('/pest-management', authenticateToken, [
  body('crop').trim().notEmpty().withMessage('Crop name is required'),
  body('symptoms').optional().isArray(),
  body('season').isIn(['kharif', 'rabi', 'summer', 'year_round']).withMessage('Valid season required'),
  body('region').trim().notEmpty().withMessage('Region is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { crop, symptoms = [], season, region } = req.body;
    const cropLower = crop.toLowerCase();

    // Generate pest and disease management advice
    const pestManagement = generatePestManagement(cropLower, season, region, symptoms);

    res.json({
      crop: cropLower,
      season,
      region,
      pestManagement,
      preventiveMeasures: getPreventiveMeasures(cropLower),
      organicSolutions: getOrganicPestSolutions(cropLower),
      emergencyContacts: [
        'Local Agricultural Extension Officer',
        'Plant Protection Officer',
        'Krishi Vigyan Kendra (KVK)'
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get pest management advice', error: error.message });
  }
});

// Get irrigation recommendations
router.post('/irrigation', authenticateToken, [
  body('crop').trim().notEmpty().withMessage('Crop name is required'),
  body('soilType').isIn(['clay', 'loamy', 'sandy', 'black', 'red', 'alluvial', 'sandy loam', 'well-drained']).withMessage('Valid soil type required'),
  body('farmSize').isFloat({ min: 0.1 }).withMessage('Farm size must be positive'),
  body('waterSource').isIn(['borewell', 'canal', 'river', 'pond', 'rainwater']).withMessage('Valid water source required'),
  body('season').isIn(['kharif', 'rabi', 'summer', 'year_round']).withMessage('Valid season required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { crop, soilType, farmSize, waterSource, season } = req.body;
    const cropLower = crop.toLowerCase();

    if (!cropDatabase[cropLower]) {
      return res.status(404).json({ message: 'Crop not found in database' });
    }

    const irrigationPlan = generateIrrigationPlan(cropLower, soilType, farmSize, waterSource, season);

    res.json({
      crop: cropLower,
      soilType,
      farmSize,
      waterSource,
      season,
      irrigationPlan,
      waterSavingTips: [
        'Use drip irrigation for water efficiency',
        'Mulch around plants to retain moisture',
        'Irrigate during early morning or evening',
        'Monitor soil moisture regularly',
        'Consider rainwater harvesting'
      ],
      estimatedWaterRequirement: calculateWaterRequirement(cropLower, farmSize, season)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get irrigation recommendations', error: error.message });
  }
});

// Helper functions
function calculateEstimatedCost(crop, farmSize) {
  const costPerAcre = {
    'rice': 25000,
    'wheat': 20000,
    'cotton': 30000,
    'sugarcane': 50000,
    'maize': 18000,
    'tomato': 40000,
    'potato': 35000
  };
  return (costPerAcre[crop] || 20000) * farmSize;
}

function calculateEstimatedRevenue(crop, farmSize) {
  const revenuePerAcre = {
    'rice': 45000,
    'wheat': 35000,
    'cotton': 55000,
    'sugarcane': 80000,
    'maize': 28000,
    'tomato': 120000,
    'potato': 70000
  };
  return (revenuePerAcre[crop] || 30000) * farmSize;
}

function calculateRiskLevel(crop, experience, region) {
  const baseRisk = {
    'rice': 'medium',
    'wheat': 'low',
    'cotton': 'high',
    'sugarcane': 'medium',
    'maize': 'low',
    'tomato': 'high',
    'potato': 'medium'
  };
  
  // Adjust based on experience
  let risk = baseRisk[crop] || 'medium';
  if (experience === 'beginner' && risk === 'high') risk = 'very high';
  if (experience === 'expert' && risk === 'high') risk = 'medium';
  
  return risk;
}

function generateGeneralTips(soilType, season, region, experience) {
  const tips = [];
  
  if (soilType === 'clay') {
    tips.push('Improve drainage in clay soils to prevent waterlogging');
  }
  if (soilType === 'sandy') {
    tips.push('Add organic matter to sandy soils to improve water retention');
  }
  if (season === 'kharif') {
    tips.push('Ensure proper drainage during monsoon season');
  }
  if (season === 'rabi') {
    tips.push('Plan irrigation schedule as there is no monsoon');
  }
  if (experience === 'beginner') {
    tips.push('Start with low-risk crops and gradually expand');
    tips.push('Connect with local farmer groups for guidance');
  }
  
  return tips;
}

function generateFertilizerSchedule(crop, farmSize, soilType, soilTestResults) {
  // Simplified fertilizer schedule generation
  const schedules = {
    'rice': [
      {
        stage: 'Basal (Before transplanting)',
        days: 0,
        fertilizers: [
          { name: 'DAP', quantity: 50 * farmSize, unit: 'kg', cost: 50 * farmSize * 27 },
          { name: 'Potash', quantity: 25 * farmSize, unit: 'kg', cost: 25 * farmSize * 20 }
        ]
      },
      {
        stage: 'First top dressing',
        days: 21,
        fertilizers: [
          { name: 'Urea', quantity: 30 * farmSize, unit: 'kg', cost: 30 * farmSize * 6 }
        ]
      },
      {
        stage: 'Second top dressing',
        days: 45,
        fertilizers: [
          { name: 'Urea', quantity: 30 * farmSize, unit: 'kg', cost: 30 * farmSize * 6 }
        ]
      }
    ]
  };
  
  return schedules[crop] || [];
}

function getOrganicAlternatives(crop) {
  return [
    'Farmyard manure (FYM) - 5-10 tons per acre',
    'Vermicompost - 2-3 tons per acre',
    'Green manuring with leguminous crops',
    'Biofertilizers (Rhizobium, Azotobacter, PSB)',
    'Neem cake for pest control and nutrition'
  ];
}

function generatePestManagement(crop, season, region, symptoms) {
  // Simplified pest management advice
  return {
    commonPests: [
      'Monitor for stem borer in rice',
      'Watch for aphids in wheat',
      'Check for bollworm in cotton'
    ],
    controlMeasures: [
      'Use pheromone traps for monitoring',
      'Apply neem-based pesticides',
      'Encourage beneficial insects',
      'Practice crop rotation'
    ],
    spraySchedule: [
      'Preventive spray at 15 days after sowing',
      'Second spray at flowering stage',
      'Additional sprays based on pest incidence'
    ]
  };
}

function getPreventiveMeasures(crop) {
  return [
    'Use certified and treated seeds',
    'Maintain proper plant spacing',
    'Remove crop residues after harvest',
    'Practice crop rotation',
    'Install yellow sticky traps'
  ];
}

function getOrganicPestSolutions(crop) {
  return [
    'Neem oil spray (3-5 ml per liter)',
    'Bt spray for caterpillar control',
    'Trichoderma for soil-borne diseases',
    'Beauveria bassiana for insect control',
    'Panchagavya for plant immunity'
  ];
}

function generateIrrigationPlan(crop, soilType, farmSize, waterSource, season) {
  return {
    frequency: 'Every 7-10 days depending on weather',
    method: waterSource === 'borewell' ? 'Drip irrigation recommended' : 'Furrow irrigation',
    criticalStages: [
      'Germination stage',
      'Flowering stage',
      'Grain filling stage'
    ],
    schedule: [
      { stage: 'Pre-sowing', days: -1, amount: '50mm' },
      { stage: 'Germination', days: 3, amount: '25mm' },
      { stage: 'Vegetative', days: 15, amount: '30mm' },
      { stage: 'Flowering', days: 45, amount: '40mm' },
      { stage: 'Maturity', days: 75, amount: '20mm' }
    ]
  };
}

function calculateWaterRequirement(crop, farmSize, season) {
  const waterRequirements = {
    'rice': 1200, // mm per season
    'wheat': 400,
    'cotton': 600,
    'sugarcane': 1800,
    'maize': 500,
    'tomato': 600,
    'potato': 400
  };
  
  const requirement = waterRequirements[crop] || 500;
  return {
    totalMM: requirement,
    totalLiters: requirement * farmSize * 4047, // Convert to liters per farm
    perIrrigation: Math.round(requirement / 8) // Assuming 8 irrigations
  };
}

module.exports = router;