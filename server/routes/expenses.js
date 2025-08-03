const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireFarmer } = require('../middleware/auth');
const Expense = require('../models/Expense');

const router = express.Router();

// Get all expenses for the farmer
router.get('/', authenticateToken, requireFarmer, [
  query('category').optional().isIn([
    'seeds', 'fertilizers', 'pesticides', 'labor', 'equipment', 'fuel',
    'irrigation', 'transportation', 'storage', 'marketing', 'insurance',
    'taxes', 'utilities', 'veterinary', 'feed', 'maintenance', 'other'
  ]),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('crop').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      category,
      startDate,
      endDate,
      crop,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { farmer: req.user._id };
    
    if (category) query.category = category;
    if (crop) query['cropRelated.crop'] = new RegExp(crop, 'i');
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Expense.countDocuments(query)
    ]);

    res.json({
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get expenses', error: error.message });
  }
});

// Get single expense by ID
router.get('/:id', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check ownership
    if (expense.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this expense' });
    }

    res.json({ expense });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get expense', error: error.message });
  }
});

// Create new expense
router.post('/', authenticateToken, requireFarmer, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('category').isIn([
    'seeds', 'fertilizers', 'pesticides', 'labor', 'equipment', 'fuel',
    'irrigation', 'transportation', 'storage', 'marketing', 'insurance',
    'taxes', 'utilities', 'veterinary', 'feed', 'maintenance', 'other'
  ]).withMessage('Invalid category'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'credit']),
  body('season').optional().isIn(['kharif', 'rabi', 'summer', 'year_round']),
  body('cropRelated.area').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expenseData = {
      ...req.body,
      farmer: req.user._id,
      date: req.body.date || new Date()
    };

    const expense = new Expense(expenseData);
    await expense.save();

    res.status(201).json({
      message: 'Expense added successfully',
      expense
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create expense', error: error.message });
  }
});

// Update expense
router.put('/:id', authenticateToken, requireFarmer, [
  body('title').optional().trim().notEmpty(),
  body('amount').optional().isFloat({ min: 0 }),
  body('category').optional().isIn([
    'seeds', 'fertilizers', 'pesticides', 'labor', 'equipment', 'fuel',
    'irrigation', 'transportation', 'storage', 'marketing', 'insurance',
    'taxes', 'utilities', 'veterinary', 'feed', 'maintenance', 'other'
  ]),
  body('date').optional().isISO8601(),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'credit']),
  body('cropRelated.area').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check ownership
    if (expense.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this expense' });
    }

    Object.assign(expense, req.body);
    await expense.save();

    res.json({
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update expense', error: error.message });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check ownership
    if (expense.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this expense' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete expense', error: error.message });
  }
});

// Get expense analytics
router.get('/analytics/summary', authenticateToken, requireFarmer, [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const farmerId = req.user._id;

    // Calculate date range
    let dateRange = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      switch (period) {
        case 'week':
          dateRange = {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          };
          break;
        case 'quarter':
          dateRange = {
            $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          };
          break;
        case 'year':
          dateRange = {
            $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          };
          break;
        case 'month':
        default:
          dateRange = {
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          };
          break;
      }
    }

    // Get total expenses and count
    const totalStats = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: dateRange
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    // Get expenses by category
    const categoryBreakdown = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: dateRange
        }
      },
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

    // Get monthly trend
    const monthlyTrend = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: {
            $gte: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get expenses by payment method
    const paymentMethodBreakdown = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: dateRange
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get crop-related expenses
    const cropExpenses = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: dateRange,
          'cropRelated.crop': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$cropRelated.crop',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    const analytics = {
      summary: {
        totalAmount: totalStats[0]?.totalAmount || 0,
        totalCount: totalStats[0]?.count || 0,
        averageAmount: totalStats[0]?.avgAmount || 0,
        period
      },
      categoryBreakdown,
      monthlyTrend,
      paymentMethodBreakdown,
      cropExpenses,
      topExpenses: await Expense.find({
        farmer: farmerId,
        date: dateRange
      })
      .sort({ amount: -1 })
      .limit(5)
      .select('title amount category date')
    };

    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get expense analytics', error: error.message });
  }
});

// Get expense categories with totals
router.get('/categories/summary', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const farmerId = req.user._id;
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const categories = await Expense.aggregate([
      {
        $match: {
          farmer: farmerId,
          date: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          lastExpense: { $max: '$date' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get category summary', error: error.message });
  }
});

// Bulk import expenses
router.post('/bulk-import', authenticateToken, requireFarmer, [
  body('expenses').isArray({ min: 1 }).withMessage('Expenses array is required'),
  body('expenses.*.title').trim().notEmpty().withMessage('Title is required for each expense'),
  body('expenses.*.amount').isFloat({ min: 0 }).withMessage('Valid amount required for each expense'),
  body('expenses.*.category').isIn([
    'seeds', 'fertilizers', 'pesticides', 'labor', 'equipment', 'fuel',
    'irrigation', 'transportation', 'storage', 'marketing', 'insurance',
    'taxes', 'utilities', 'veterinary', 'feed', 'maintenance', 'other'
  ]).withMessage('Valid category required for each expense')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { expenses } = req.body;
    const farmerId = req.user._id;

    // Add farmer ID to each expense
    const expensesToInsert = expenses.map(expense => ({
      ...expense,
      farmer: farmerId,
      date: expense.date ? new Date(expense.date) : new Date()
    }));

    const insertedExpenses = await Expense.insertMany(expensesToInsert);

    res.status(201).json({
      message: `${insertedExpenses.length} expenses imported successfully`,
      count: insertedExpenses.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to import expenses', error: error.message });
  }
});

module.exports = router;