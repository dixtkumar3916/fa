const express = require('express');
const Expense = require('../models/Expense');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/expenses
// @desc    Add new expense
// @access  Private
router.post('/', farmerAuth, async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      farmer: req.user._id
    });

    await expense.save();
    await expense.populate('crop', 'name variety');

    res.status(201).json({
      message: 'Expense added successfully',
      expense
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses
// @desc    Get farmer's expenses
// @access  Private
router.get('/', farmerAuth, async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    let query = { farmer: req.user._id };
    
    if (category) query.category = category;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const expenses = await Expense.find(query)
      .populate('crop', 'name variety')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/summary
// @desc    Get expense summary/analytics
// @access  Private
router.get('/summary', farmerAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month } = req.query;
    
    let matchStage = {
      farmer: req.user._id,
      date: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      }
    };

    if (month) {
      matchStage.date = {
        $gte: new Date(`${year}-${month.padStart(2, '0')}-01`),
        $lte: new Date(`${year}-${month.padStart(2, '0')}-31`)
      };
    }

    const summary = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalExpenses = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyTrend = await Expense.aggregate([
      {
        $match: {
          farmer: req.user._id,
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      categoryBreakdown: summary,
      totalExpenses: totalExpenses[0] || { total: 0, count: 0 },
      monthlyTrend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private
router.put('/:id', farmerAuth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      farmer: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    Object.assign(expense, req.body);
    await expense.save();
    await expense.populate('crop', 'name variety');

    res.json({
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete('/:id', farmerAuth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;