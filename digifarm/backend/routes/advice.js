const express = require('express');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// Crop recommendation data
const cropDatabase = {
  'clay': {
    'summer': ['rice', 'cotton', 'sugarcane', 'wheat'],
    'winter': ['wheat', 'barley', 'peas', 'mustard'],
    'monsoon': ['rice', 'cotton', 'jute', 'sugarcane']
  },
  'sandy': {
    'summer': ['millet', 'groundnut', 'cotton', 'sorghum'],
    'winter': ['wheat', 'barley', 'gram', 'mustard'],
    'monsoon': ['millet', 'maize', 'groundnut', 'cotton']
  },
  'loamy': {
    'summer': ['maize', 'cotton', 'sugarcane', 'vegetables'],
    'winter': ['wheat', 'barley', 'peas', 'potato'],
    'monsoon': ['rice', 'maize', 'cotton', 'vegetables']
  },
  'silt': {
    'summer': ['rice', 'vegetables', 'fruits', 'sugarcane'],
    'winter': ['wheat', 'vegetables', 'fruits', 'barley'],
    'monsoon': ['rice', 'vegetables', 'jute', 'sugarcane']
  }
};

const fertilizers = {
  'rice': ['Urea', 'DAP', 'Potash', 'Zinc Sulphate'],
  'wheat': ['Urea', 'DAP', 'Potash'],
  'cotton': ['Urea', 'DAP', 'Potash', 'Boron'],
  'maize': ['Urea', 'DAP', 'Potash'],
  'sugarcane': ['Urea', 'DAP', 'Potash', 'Sulphur'],
  'groundnut': ['DAP', 'Potash', 'Gypsum'],
  'vegetables': ['NPK Complex', 'Organic Compost', 'Micronutrients'],
  'fruits': ['NPK Complex', 'Organic Manure', 'Calcium']
};

const cropDetails = {
  'rice': {
    plantingTime: 'June-July',
    harvestTime: 'October-November',
    waterRequirement: 'High',
    duration: '120-150 days',
    yield: '40-50 quintals/acre',
    marketPrice: '₹1800-2200/quintal'
  },
  'wheat': {
    plantingTime: 'November-December',
    harvestTime: 'March-April',
    waterRequirement: 'Medium',
    duration: '120-140 days',
    yield: '25-35 quintals/acre',
    marketPrice: '₹2000-2400/quintal'
  },
  'cotton': {
    plantingTime: 'May-June',
    harvestTime: 'October-January',
    waterRequirement: 'Medium',
    duration: '180-200 days',
    yield: '10-15 quintals/acre',
    marketPrice: '₹5000-6000/quintal'
  },
  'maize': {
    plantingTime: 'June-July',
    harvestTime: 'September-October',
    waterRequirement: 'Medium',
    duration: '90-120 days',
    yield: '30-40 quintals/acre',
    marketPrice: '₹1400-1800/quintal'
  }
};

// @route   POST /api/advice/crop-recommendation
// @desc    Get crop recommendations based on soil, season, and location
// @access  Private
router.post('/crop-recommendation', farmerAuth, async (req, res) => {
  try {
    const { soilType, season, farmSize, region, budget } = req.body;

    if (!soilType || !season) {
      return res.status(400).json({ message: 'Soil type and season are required' });
    }

    const recommendedCrops = cropDatabase[soilType.toLowerCase()]?.[season.toLowerCase()] || [];
    
    const recommendations = recommendedCrops.map(crop => ({
      name: crop,
      suitability: Math.floor(Math.random() * 20 + 80), // 80-100% suitability
      details: cropDetails[crop] || {
        plantingTime: 'Varies',
        harvestTime: 'Varies',
        waterRequirement: 'Medium',
        duration: '90-120 days',
        yield: '20-30 quintals/acre',
        marketPrice: '₹1500-2000/quintal'
      },
      fertilizers: fertilizers[crop] || ['NPK Complex', 'Organic Compost'],
      estimatedCost: Math.floor(Math.random() * 20000 + 15000), // ₹15,000-35,000 per acre
      estimatedProfit: Math.floor(Math.random() * 25000 + 20000), // ₹20,000-45,000 per acre
      riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
    }));

    // Sort by suitability
    recommendations.sort((a, b) => b.suitability - a.suitability);

    res.json({
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      factors: {
        soilType,
        season,
        farmSize,
        region,
        analysisDate: new Date()
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/advice/fertilizer-recommendation
// @desc    Get fertilizer recommendations for specific crop
// @access  Private
router.post('/fertilizer-recommendation', farmerAuth, async (req, res) => {
  try {
    const { cropName, soilType, farmSize, currentStage } = req.body;

    if (!cropName) {
      return res.status(400).json({ message: 'Crop name is required' });
    }

    const baseFertilizers = fertilizers[cropName.toLowerCase()] || ['NPK Complex', 'Organic Compost'];
    
    const recommendations = baseFertilizers.map(fertilizer => ({
      name: fertilizer,
      quantity: `${Math.floor(Math.random() * 50 + 25)} kg/acre`,
      applicationTime: getApplicationTime(currentStage),
      method: getApplicationMethod(fertilizer),
      cost: `₹${Math.floor(Math.random() * 2000 + 1000)}/acre`,
      benefits: getFertilizerBenefits(fertilizer)
    }));

    res.json({
      recommendations,
      totalCost: `₹${Math.floor(Math.random() * 8000 + 5000)}/acre`,
      applicationSchedule: getApplicationSchedule(cropName),
      tips: [
        'Apply fertilizers in split doses for better nutrient uptake',
        'Always test soil before fertilizer application',
        'Consider organic alternatives for sustainable farming'
      ]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/advice/pest-control/:cropName
// @desc    Get pest control recommendations for specific crop
// @access  Private
router.get('/pest-control/:cropName', farmerAuth, async (req, res) => {
  try {
    const { cropName } = req.params;
    
    const commonPests = {
      'rice': ['Brown planthopper', 'Rice stem borer', 'Leaf folder'],
      'wheat': ['Aphids', 'Termites', 'Army worm'],
      'cotton': ['Bollworm', 'Whitefly', 'Aphids'],
      'maize': ['Fall army worm', 'Stem borer', 'Aphids']
    };

    const pestControl = (commonPests[cropName.toLowerCase()] || ['Generic pests']).map(pest => ({
      pest,
      symptoms: `Damage symptoms of ${pest}`,
      organicControl: ['Neem oil spray', 'Bt spray', 'Pheromone traps'],
      chemicalControl: ['Recommended pesticide based on pest'],
      preventiveMeasures: ['Crop rotation', 'Field sanitation', 'Resistant varieties'],
      severity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
    }));

    res.json({
      pestControl,
      generalTips: [
        'Regular field monitoring is essential',
        'Use IPM (Integrated Pest Management) approach',
        'Maintain beneficial insects population'
      ]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions
function getApplicationTime(stage) {
  const stages = {
    'planting': 'At sowing time',
    'vegetative': 'During vegetative growth',
    'flowering': 'At flowering stage',
    'maturity': 'Before maturity'
  };
  return stages[stage] || 'As per crop requirement';
}

function getApplicationMethod(fertilizer) {
  const methods = {
    'Urea': 'Broadcasting or side dressing',
    'DAP': 'Basal application',
    'Potash': 'Broadcasting',
    'NPK Complex': 'Basal application'
  };
  return methods[fertilizer] || 'As per manufacturer guidelines';
}

function getFertilizerBenefits(fertilizer) {
  const benefits = {
    'Urea': 'Provides nitrogen for vegetative growth',
    'DAP': 'Supplies phosphorus for root development',
    'Potash': 'Enhances fruit quality and disease resistance',
    'NPK Complex': 'Balanced nutrition for overall growth'
  };
  return benefits[fertilizer] || 'Provides essential nutrients';
}

function getApplicationSchedule(cropName) {
  return [
    { stage: 'Basal', timing: 'At sowing', fertilizers: ['DAP', 'Potash'] },
    { stage: 'First top dressing', timing: '20-25 days after sowing', fertilizers: ['Urea'] },
    { stage: 'Second top dressing', timing: '45-50 days after sowing', fertilizers: ['Urea'] }
  ];
}

module.exports = router;