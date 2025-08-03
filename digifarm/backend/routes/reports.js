const express = require('express');
const Expense = require('../models/Expense');
const Crop = require('../models/Crop');
const MarketListing = require('../models/MarketListing');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/expenses
// @desc    Generate expense report data
// @access  Private
router.get('/expenses', farmerAuth, async (req, res) => {
  try {
    const { startDate, endDate, category, format = 'json' } = req.query;
    
    let query = { farmer: req.user._id };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (category) {
      query.category = category;
    }

    const expenses = await Expense.find(query)
      .populate('crop', 'name variety')
      .sort({ date: -1 });

    const summary = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    const reportData = {
      expenses,
      summary,
      totalExpenses,
      period: { startDate, endDate },
      generatedAt: new Date(),
      farmer: {
        name: req.user.name,
        location: req.user.location
      }
    };

    if (format === 'pdf') {
      // In a real application, generate PDF here
      res.json({
        message: 'PDF generation would be implemented here',
        downloadUrl: '/api/reports/download/expenses.pdf',
        ...reportData
      });
    } else {
      res.json(reportData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/sales
// @desc    Generate sales report data
// @access  Private
router.get('/sales', farmerAuth, async (req, res) => {
  try {
    const { startDate, endDate, cropName, format = 'json' } = req.query;
    
    let query = { 
      farmer: req.user._id,
      status: 'sold'
    };
    
    if (startDate && endDate) {
      query.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (cropName) {
      query.cropName = { $regex: cropName, $options: 'i' };
    }

    const sales = await MarketListing.find(query)
      .sort({ updatedAt: -1 });

    const summary = await MarketListing.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$cropName',
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalPrice' },
          avgPrice: { $avg: '$pricePerUnit' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);

    const reportData = {
      sales,
      summary,
      totalRevenue,
      totalQuantity,
      period: { startDate, endDate },
      generatedAt: new Date(),
      farmer: {
        name: req.user.name,
        location: req.user.location
      }
    };

    if (format === 'pdf') {
      res.json({
        message: 'PDF generation would be implemented here',
        downloadUrl: '/api/reports/download/sales.pdf',
        ...reportData
      });
    } else {
      res.json(reportData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/crops
// @desc    Generate crop performance report
// @access  Private
router.get('/crops', farmerAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), format = 'json' } = req.query;
    
    const query = {
      farmer: req.user._id,
      plantingDate: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      }
    };

    const crops = await Crop.find(query)
      .populate('expenses')
      .sort({ plantingDate: -1 });

    const performance = await Crop.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$name',
          totalArea: { $sum: '$area' },
          totalPlanted: { $sum: '$quantity.planted' },
          totalHarvested: { $sum: '$quantity.harvested' },
          totalRevenue: { $sum: '$totalRevenue' },
          avgYield: { $avg: { $divide: ['$quantity.harvested', '$area'] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    const totalArea = crops.reduce((sum, crop) => sum + crop.area, 0);
    const totalRevenue = crops.reduce((sum, crop) => sum + (crop.totalRevenue || 0), 0);

    const reportData = {
      crops,
      performance,
      totalArea,
      totalRevenue,
      year: parseInt(year),
      generatedAt: new Date(),
      farmer: {
        name: req.user.name,
        location: req.user.location,
        farmDetails: req.user.farmDetails
      }
    };

    if (format === 'pdf') {
      res.json({
        message: 'PDF generation would be implemented here',
        downloadUrl: '/api/reports/download/crops.pdf',
        ...reportData
      });
    } else {
      res.json(reportData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/comprehensive
// @desc    Generate comprehensive farm report
// @access  Private
router.get('/comprehensive', farmerAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), format = 'json' } = req.query;
    
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    // Get all data in parallel
    const [expenses, sales, crops] = await Promise.all([
      Expense.find({
        farmer: req.user._id,
        date: { $gte: startDate, $lte: endDate }
      }).populate('crop', 'name variety'),
      
      MarketListing.find({
        farmer: req.user._id,
        status: 'sold',
        updatedAt: { $gte: startDate, $lte: endDate }
      }),
      
      Crop.find({
        farmer: req.user._id,
        plantingDate: { $gte: startDate, $lte: endDate }
      }).populate('expenses')
    ]);

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalArea = crops.reduce((sum, crop) => sum + crop.area, 0);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthExpenses = expenses
        .filter(e => e.date.getMonth() + 1 === month)
        .reduce((sum, e) => sum + e.amount, 0);
      const monthSales = sales
        .filter(s => s.updatedAt.getMonth() + 1 === month)
        .reduce((sum, s) => sum + s.totalPrice, 0);
      
      return {
        month,
        expenses: monthExpenses,
        sales: monthSales,
        profit: monthSales - monthExpenses
      };
    });

    const reportData = {
      summary: {
        totalExpenses,
        totalRevenue,
        netProfit,
        totalArea,
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0
      },
      monthlyData,
      expenses: expenses.slice(0, 10), // Recent 10 expenses
      sales: sales.slice(0, 10), // Recent 10 sales
      crops: crops.slice(0, 10), // Recent 10 crops
      year: parseInt(year),
      generatedAt: new Date(),
      farmer: {
        name: req.user.name,
        location: req.user.location,
        farmDetails: req.user.farmDetails
      }
    };

    if (format === 'pdf') {
      res.json({
        message: 'PDF generation would be implemented here',
        downloadUrl: '/api/reports/download/comprehensive.pdf',
        ...reportData
      });
    } else {
      res.json(reportData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;