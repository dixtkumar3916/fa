const express = require('express');
const Farmer = require('../models/Farmer');
const Crop = require('../models/Crop');
const Expense = require('../models/Expense');
const MarketListing = require('../models/MarketListing');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/farmers/dashboard
// @desc    Get farmer dashboard data
// @access  Private
router.get('/dashboard', farmerAuth, async (req, res) => {
  try {
    const farmerId = req.user._id;
    
    // Get current month/year for calculations
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Total expenses this month
    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Active crops count
    const activeCrops = await Crop.countDocuments({
      farmer: farmerId,
      status: { $in: ['planted', 'growing'] }
    });

    // Total sales this month
    const monthlySales = await MarketListing.aggregate([
      {
        $match: {
          farmer: farmerId,
          status: 'sold',
          updatedAt: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Active market listings
    const activeListings = await MarketListing.countDocuments({
      farmer: farmerId,
      status: 'active'
    });

    // Recent expenses
    const recentExpenses = await Expense.find({ farmer: farmerId })
      .sort({ date: -1 })
      .limit(5)
      .populate('crop', 'name variety');

    // Upcoming harvests
    const upcomingHarvests = await Crop.find({
      farmer: farmerId,
      status: { $in: ['planted', 'growing'] },
      expectedHarvestDate: {
        $gte: currentDate,
        $lte: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      }
    }).sort({ expectedHarvestDate: 1 });

    // Expense breakdown by category
    const expenseBreakdown = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    res.json({
      summary: {
        monthlyExpenses: monthlyExpenses[0]?.total || 0,
        activeCrops,
        monthlySales: monthlySales[0]?.total || 0,
        activeListings
      },
      recentExpenses,
      upcomingHarvests,
      expenseBreakdown,
      farmer: {
        name: req.user.name,
        location: req.user.location,
        farmDetails: req.user.farmDetails
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/farmers/analytics
// @desc    Get farmer analytics data
// @access  Private
router.get('/analytics', farmerAuth, async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { year = new Date().getFullYear() } = req.query;

    // Monthly expense trend
    const monthlyExpenseTrend = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Monthly sales trend
    const monthlySalesTrend = await MarketListing.aggregate([
      {
        $match: {
          farmer: farmerId,
          status: 'sold',
          updatedAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$updatedAt' },
          amount: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Crop performance
    const cropPerformance = await Crop.aggregate([
      {
        $match: {
          farmer: farmerId,
          status: 'harvested',
          actualHarvestDate: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: '$name',
          totalArea: { $sum: '$area' },
          totalHarvested: { $sum: '$quantity.harvested' },
          totalRevenue: { $sum: '$totalRevenue' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json({
      monthlyExpenseTrend,
      monthlySalesTrend,
      cropPerformance,
      year: parseInt(year)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;