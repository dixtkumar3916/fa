const mongoose = require('mongoose');

const soilReportSchema = new mongoose.Schema({
  // Basic Information
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmLocation: {
    address: String,
    coordinates: [Number],
    area: Number // in acres
  },
  
  // Soil Analysis Data
  soilType: {
    type: String,
    enum: ['clay', 'sandy', 'loamy', 'silt', 'peaty', 'chalky'],
    required: true
  },
  
  // Chemical Properties
  pH: {
    value: {
      type: Number,
      min: 0,
      max: 14
    },
    status: {
      type: String,
      enum: ['very_acidic', 'acidic', 'neutral', 'alkaline', 'very_alkaline']
    }
  },
  
  nitrogen: {
    value: Number, // kg/ha
    status: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high']
    }
  },
  
  phosphorus: {
    value: Number, // kg/ha
    status: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high']
    }
  },
  
  potassium: {
    value: Number, // kg/ha
    status: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high']
    }
  },
  
  organicMatter: {
    value: Number, // percentage
    status: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high']
    }
  },
  
  // Physical Properties
  texture: {
    sand: Number, // percentage
    silt: Number, // percentage
    clay: Number  // percentage
  },
  
  bulkDensity: {
    value: Number, // g/cm³
    status: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  
  waterHoldingCapacity: {
    value: Number, // percentage
    status: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  
  // Additional Properties
  electricalConductivity: {
    value: Number, // dS/m
    status: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high']
    }
  },
  
  calciumCarbonate: {
    value: Number, // percentage
    status: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  
  micronutrients: {
    zinc: {
      value: Number,
      status: { type: String, enum: ['deficient', 'sufficient', 'excess'] }
    },
    iron: {
      value: Number,
      status: { type: String, enum: ['deficient', 'sufficient', 'excess'] }
    },
    manganese: {
      value: Number,
      status: { type: String, enum: ['deficient', 'sufficient', 'excess'] }
    },
    copper: {
      value: Number,
      status: { type: String, enum: ['deficient', 'sufficient', 'excess'] }
    },
    boron: {
      value: Number,
      status: { type: String, enum: ['deficient', 'sufficient', 'excess'] }
    }
  },
  
  // AI Analysis & Recommendations
  aiAnalysis: {
    overallHealth: {
      type: String,
      enum: ['poor', 'fair', 'good', 'excellent']
    },
    recommendations: [{
      category: {
        type: String,
        enum: ['fertilizer', 'irrigation', 'crop_selection', 'soil_amendment', 'pest_control']
      },
      title: String,
      description: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      estimatedCost: Number,
      implementationTime: String
    }],
    suitableCrops: [{
      name: String,
      confidence: Number, // percentage
      reasons: [String],
      expectedYield: String,
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }],
    fertilizerPlan: [{
      type: String,
      name: String,
      quantity: String,
      applicationMethod: String,
      timing: String,
      cost: Number
    }],
    irrigationRecommendations: {
      method: String,
      frequency: String,
      duration: String,
      waterRequirement: String
    }
  },
  
  // Expert Review
  expertReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    comments: String,
    additionalRecommendations: [String],
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // File Attachments
  attachments: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'image', 'document']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'analyzed', 'reviewed', 'completed'],
    default: 'pending'
  },
  
  // Metadata
  sampleDate: Date,
  analysisDate: Date,
  laboratory: String,
  reportNumber: String,
  
  // Historical Data
  previousReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SoilReport'
  }],
  
  // Notes
  notes: String,
  tags: [String]
}, {
  timestamps: true
});

// Indexes
soilReportSchema.index({ farmer: 1, createdAt: -1 });
soilReportSchema.index({ 'farmLocation.coordinates': '2dsphere' });
soilReportSchema.index({ status: 1 });
soilReportSchema.index({ 'aiAnalysis.overallHealth': 1 });

// Virtual for soil health score
soilReportSchema.virtual('soilHealthScore').get(function() {
  let score = 0;
  let factors = 0;
  
  // pH scoring (optimal range 6.0-7.5)
  if (this.pH && this.pH.value) {
    factors++;
    if (this.pH.value >= 6.0 && this.pH.value <= 7.5) {
      score += 25;
    } else if (this.pH.value >= 5.5 && this.pH.value <= 8.0) {
      score += 15;
    } else {
      score += 5;
    }
  }
  
  // NPK scoring
  const npkFactors = ['nitrogen', 'phosphorus', 'potassium'];
  npkFactors.forEach(factor => {
    if (this[factor] && this[factor].status) {
      factors++;
      switch (this[factor].status) {
        case 'very_high':
          score += 20;
          break;
        case 'high':
          score += 25;
          break;
        case 'medium':
          score += 20;
          break;
        case 'low':
          score += 10;
          break;
      }
    }
  });
  
  // Organic matter scoring
  if (this.organicMatter && this.organicMatter.status) {
    factors++;
    switch (this.organicMatter.status) {
      case 'very_high':
        score += 25;
        break;
      case 'high':
        score += 20;
        break;
      case 'medium':
        score += 15;
        break;
      case 'low':
        score += 5;
        break;
    }
  }
  
  return factors > 0 ? Math.round(score / factors) : 0;
});

// Method to generate AI recommendations
soilReportSchema.methods.generateAIRecommendations = function() {
  const recommendations = [];
  
  // pH recommendations
  if (this.pH && this.pH.value) {
    if (this.pH.value < 6.0) {
      recommendations.push({
        category: 'soil_amendment',
        title: 'Lime Application Required',
        description: 'Soil pH is acidic. Consider applying agricultural lime to raise pH to optimal range.',
        priority: 'high',
        estimatedCost: 5000,
        implementationTime: '2-3 weeks before planting'
      });
    } else if (this.pH.value > 7.5) {
      recommendations.push({
        category: 'soil_amendment',
        title: 'Sulfur Application Recommended',
        description: 'Soil pH is alkaline. Consider applying elemental sulfur to lower pH.',
        priority: 'medium',
        estimatedCost: 3000,
        implementationTime: '3-4 weeks before planting'
      });
    }
  }
  
  // NPK recommendations
  if (this.nitrogen && this.nitrogen.status === 'low') {
    recommendations.push({
      category: 'fertilizer',
      title: 'Nitrogen Fertilizer Application',
      description: 'Soil nitrogen levels are low. Apply nitrogen-rich fertilizers.',
      priority: 'high',
      estimatedCost: 2000,
      implementationTime: 'At planting and during growth stages'
    });
  }
  
  if (this.phosphorus && this.phosphorus.status === 'low') {
    recommendations.push({
      category: 'fertilizer',
      title: 'Phosphorus Fertilizer Application',
      description: 'Soil phosphorus levels are low. Apply phosphorus-rich fertilizers.',
      priority: 'high',
      estimatedCost: 2500,
      implementationTime: 'At planting time'
    });
  }
  
  if (this.potassium && this.potassium.status === 'low') {
    recommendations.push({
      category: 'fertilizer',
      title: 'Potassium Fertilizer Application',
      description: 'Soil potassium levels are low. Apply potassium-rich fertilizers.',
      priority: 'medium',
      estimatedCost: 2000,
      implementationTime: 'At planting and during flowering'
    });
  }
  
  // Organic matter recommendations
  if (this.organicMatter && this.organicMatter.status === 'low') {
    recommendations.push({
      category: 'soil_amendment',
      title: 'Organic Matter Enhancement',
      description: 'Soil organic matter is low. Add compost, manure, or green manure.',
      priority: 'medium',
      estimatedCost: 1500,
      implementationTime: 'Before planting season'
    });
  }
  
  this.aiAnalysis.recommendations = recommendations;
  return recommendations;
};

// Method to suggest suitable crops
soilReportSchema.methods.suggestSuitableCrops = function() {
  const crops = [];
  
  // Based on soil type
  if (this.soilType === 'clay') {
    crops.push({
      name: 'Rice',
      confidence: 85,
      reasons: ['Clay soil retains water well', 'Suitable for paddy cultivation'],
      expectedYield: '4-6 tons per hectare',
      riskLevel: 'low'
    });
    crops.push({
      name: 'Wheat',
      confidence: 75,
      reasons: ['Good for wheat cultivation', 'Requires proper drainage'],
      expectedYield: '3-4 tons per hectare',
      riskLevel: 'medium'
    });
  } else if (this.soilType === 'sandy') {
    crops.push({
      name: 'Groundnut',
      confidence: 80,
      reasons: ['Sandy soil is ideal for groundnut', 'Good drainage required'],
      expectedYield: '2-3 tons per hectare',
      riskLevel: 'low'
    });
    crops.push({
      name: 'Potato',
      confidence: 70,
      reasons: ['Suitable for potato cultivation', 'Requires regular irrigation'],
      expectedYield: '20-25 tons per hectare',
      riskLevel: 'medium'
    });
  }
  
  // Based on pH
  if (this.pH && this.pH.value) {
    if (this.pH.value >= 6.0 && this.pH.value <= 7.0) {
      crops.push({
        name: 'Maize',
        confidence: 90,
        reasons: ['Optimal pH range for maize', 'Good soil conditions'],
        expectedYield: '8-10 tons per hectare',
        riskLevel: 'low'
      });
    }
  }
  
  this.aiAnalysis.suitableCrops = crops;
  return crops;
};

module.exports = mongoose.model('SoilReport', soilReportSchema);