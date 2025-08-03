const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken, requireFarmer } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Crop = require('../models/Crop');
const Sensor = require('../models/Sensor');
const jsPDF = require('jspdf');
const ExcelJS = require('exceljs');

const router = express.Router();

// Generate expense report
router.get('/expenses', authenticateToken, requireFarmer, [
  query('format').isIn(['pdf', 'excel', 'json']).withMessage('Valid format required'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('category').optional().trim(),
  query('period').optional().isIn(['month', 'quarter', 'year'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { format, startDate, endDate, category, period } = req.query;
    const farmerId = req.user._id;

    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (period) {
      switch (period) {
        case 'month':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          };
          break;
        case 'quarter':
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
          dateFilter = { $gte: quarterStart, $lte: quarterEnd };
          break;
        case 'year':
          dateFilter = {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lte: new Date(now.getFullYear(), 11, 31)
          };
          break;
      }
    }

    // Build query
    const query = { farmer: farmerId };
    if (Object.keys(dateFilter).length > 0) query.date = dateFilter;
    if (category) query.category = category;

    // Get expenses and analytics
    const [expenses, totalStats, categoryBreakdown] = await Promise.all([
      Expense.find(query).sort({ date: -1 }),
      Expense.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        }
      ]),
      Expense.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ])
    ]);

    const reportData = {
      farmer: req.user.name,
      generatedAt: new Date(),
      period: period || 'custom',
      dateRange: {
        start: startDate || (Object.keys(dateFilter).length > 0 ? dateFilter.$gte : null),
        end: endDate || (Object.keys(dateFilter).length > 0 ? dateFilter.$lte : null)
      },
      summary: {
        totalExpenses: totalStats[0]?.totalAmount || 0,
        totalCount: totalStats[0]?.count || 0,
        averageExpense: totalStats[0]?.avgAmount || 0
      },
      categoryBreakdown,
      expenses
    };

    if (format === 'json') {
      return res.json(reportData);
    } else if (format === 'pdf') {
      const pdfBuffer = await generateExpensePDF(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="expense-report-${Date.now()}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === 'excel') {
      const excelBuffer = await generateExpenseExcel(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="expense-report-${Date.now()}.xlsx"`);
      return res.send(excelBuffer);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate expense report', error: error.message });
  }
});

// Generate sales report
router.get('/sales', authenticateToken, requireFarmer, [
  query('format').isIn(['pdf', 'excel', 'json']).withMessage('Valid format required'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('status').optional().isIn(['sold', 'available', 'reserved', 'expired'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { format, startDate, endDate, status } = req.query;
    const farmerId = req.user._id;

    // Build query
    const query = { farmer: farmerId };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) query.updatedAt.$gte = new Date(startDate);
      if (endDate) query.updatedAt.$lte = new Date(endDate);
    }

    // Get crops and analytics
    const [crops, salesStats, categoryBreakdown] = await Promise.all([
      Crop.find(query).sort({ updatedAt: -1 }),
      Crop.aggregate([
        { $match: { ...query, status: 'sold' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price.value' },
            totalQuantity: { $sum: '$quantity.value' },
            count: { $sum: 1 }
          }
        }
      ]),
      Crop.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            totalRevenue: { $sum: '$price.value' },
            count: { $sum: 1 },
            avgPrice: { $avg: '$price.value' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ])
    ]);

    const reportData = {
      farmer: req.user.name,
      generatedAt: new Date(),
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalRevenue: salesStats[0]?.totalRevenue || 0,
        totalQuantity: salesStats[0]?.totalQuantity || 0,
        totalSales: salesStats[0]?.count || 0,
        totalListings: crops.length
      },
      categoryBreakdown,
      crops
    };

    if (format === 'json') {
      return res.json(reportData);
    } else if (format === 'pdf') {
      const pdfBuffer = await generateSalesPDF(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${Date.now()}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === 'excel') {
      const excelBuffer = await generateSalesExcel(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${Date.now()}.xlsx"`);
      return res.send(excelBuffer);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate sales report', error: error.message });
  }
});

// Generate sensor data report
router.get('/sensors', authenticateToken, requireFarmer, [
  query('format').isIn(['pdf', 'excel', 'json']).withMessage('Valid format required'),
  query('sensorId').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('metric').optional().isIn(['temperature', 'humidity', 'soilMoisture', 'pH'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { format, sensorId, startDate, endDate, metric } = req.query;
    const farmerId = req.user._id;

    // Build query
    const query = { farmer: farmerId };
    if (sensorId) query._id = sensorId;

    const sensors = await Sensor.find(query);
    
    if (sensors.length === 0) {
      return res.status(404).json({ message: 'No sensors found' });
    }

    // Process sensor data
    const sensorData = sensors.map(sensor => {
      let readings = sensor.readings;
      
      // Filter by date range
      if (startDate || endDate) {
        readings = readings.filter(reading => {
          const readingDate = reading.timestamp;
          if (startDate && readingDate < new Date(startDate)) return false;
          if (endDate && readingDate > new Date(endDate)) return false;
          return true;
        });
      }

      // Calculate statistics for each metric
      const stats = {};
      ['temperature', 'humidity', 'soilMoisture', 'pH'].forEach(metricName => {
        const values = readings
          .filter(r => r[metricName] && r[metricName].value !== undefined)
          .map(r => r[metricName].value);
        
        if (values.length > 0) {
          stats[metricName] = {
            count: values.length,
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values)
          };
        }
      });

      return {
        sensor: {
          id: sensor._id,
          name: sensor.name,
          type: sensor.type,
          location: sensor.location
        },
        readingsCount: readings.length,
        dateRange: {
          start: readings.length > 0 ? readings[0].timestamp : null,
          end: readings.length > 0 ? readings[readings.length - 1].timestamp : null
        },
        statistics: stats,
        recentReadings: readings.slice(-10) // Last 10 readings
      };
    });

    const reportData = {
      farmer: req.user.name,
      generatedAt: new Date(),
      dateRange: {
        start: startDate,
        end: endDate
      },
      sensorsCount: sensors.length,
      sensorData
    };

    if (format === 'json') {
      return res.json(reportData);
    } else if (format === 'pdf') {
      const pdfBuffer = await generateSensorPDF(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sensor-report-${Date.now()}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === 'excel') {
      const excelBuffer = await generateSensorExcel(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="sensor-report-${Date.now()}.xlsx"`);
      return res.send(excelBuffer);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate sensor report', error: error.message });
  }
});

// Generate comprehensive farm report
router.get('/comprehensive', authenticateToken, requireFarmer, [
  query('format').isIn(['pdf', 'excel', 'json']).withMessage('Valid format required'),
  query('period').optional().isIn(['month', 'quarter', 'year'])
], async (req, res) => {
  try {
    const { format, period = 'month' } = req.query;
    const farmerId = req.user._id;

    // Calculate date range
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }

    // Get all data in parallel
    const [
      expenseStats,
      cropStats,
      sensorCount,
      recentExpenses,
      recentCrops
    ] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            farmer: farmerId,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Crop.aggregate([
        {
          $match: {
            farmer: farmerId,
            updatedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$price.value' }
          }
        }
      ]),
      Sensor.countDocuments({ farmer: farmerId, status: 'active' }),
      Expense.find({
        farmer: farmerId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 }).limit(10),
      Crop.find({
        farmer: farmerId,
        updatedAt: { $gte: startDate, $lte: endDate }
      }).sort({ updatedAt: -1 }).limit(10)
    ]);

    const reportData = {
      farmer: req.user.name,
      generatedAt: new Date(),
      period,
      dateRange: { start: startDate, end: endDate },
      summary: {
        expenses: {
          total: expenseStats[0]?.totalAmount || 0,
          count: expenseStats[0]?.count || 0
        },
        crops: cropStats,
        activeSensors: sensorCount
      },
      recentActivity: {
        expenses: recentExpenses,
        crops: recentCrops
      }
    };

    if (format === 'json') {
      return res.json(reportData);
    } else if (format === 'pdf') {
      const pdfBuffer = await generateComprehensivePDF(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="farm-report-${Date.now()}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === 'excel') {
      const excelBuffer = await generateComprehensiveExcel(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="farm-report-${Date.now()}.xlsx"`);
      return res.send(excelBuffer);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate comprehensive report', error: error.message });
  }
});

// Helper functions for PDF generation
async function generateExpensePDF(data) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Expense Report', 20, 20);
  
  // Farmer info
  doc.setFontSize(12);
  doc.text(`Farmer: ${data.farmer}`, 20, 35);
  doc.text(`Generated: ${data.generatedAt.toLocaleDateString()}`, 20, 45);
  doc.text(`Period: ${data.period}`, 20, 55);
  
  // Summary
  doc.setFontSize(16);
  doc.text('Summary', 20, 75);
  doc.setFontSize(12);
  doc.text(`Total Expenses: ₹${data.summary.totalExpenses.toLocaleString()}`, 20, 90);
  doc.text(`Total Count: ${data.summary.totalCount}`, 20, 100);
  doc.text(`Average Expense: ₹${data.summary.averageExpense.toFixed(2)}`, 20, 110);
  
  // Category breakdown
  let yPos = 130;
  doc.setFontSize(16);
  doc.text('Category Breakdown', 20, yPos);
  yPos += 15;
  
  doc.setFontSize(12);
  data.categoryBreakdown.forEach(category => {
    doc.text(`${category._id}: ₹${category.totalAmount.toLocaleString()} (${category.count} items)`, 20, yPos);
    yPos += 10;
  });
  
  return Buffer.from(doc.output('arraybuffer'));
}

async function generateExpenseExcel(data) {
  const workbook = new ExcelJS.Workbook();
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Expense Report']);
  summarySheet.addRow(['Farmer:', data.farmer]);
  summarySheet.addRow(['Generated:', data.generatedAt.toLocaleDateString()]);
  summarySheet.addRow(['Period:', data.period]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Expenses:', data.summary.totalExpenses]);
  summarySheet.addRow(['Total Count:', data.summary.totalCount]);
  summarySheet.addRow(['Average Expense:', data.summary.averageExpense]);
  
  // Category breakdown sheet
  const categorySheet = workbook.addWorksheet('Category Breakdown');
  categorySheet.addRow(['Category', 'Total Amount', 'Count']);
  data.categoryBreakdown.forEach(category => {
    categorySheet.addRow([category._id, category.totalAmount, category.count]);
  });
  
  // Expenses detail sheet
  const expensesSheet = workbook.addWorksheet('Expenses');
  expensesSheet.addRow(['Date', 'Title', 'Category', 'Amount', 'Payment Method']);
  data.expenses.forEach(expense => {
    expensesSheet.addRow([
      expense.date.toLocaleDateString(),
      expense.title,
      expense.category,
      expense.amount,
      expense.paymentMethod
    ]);
  });
  
  return await workbook.xlsx.writeBuffer();
}

async function generateSalesPDF(data) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Sales Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Farmer: ${data.farmer}`, 20, 35);
  doc.text(`Generated: ${data.generatedAt.toLocaleDateString()}`, 20, 45);
  
  doc.setFontSize(16);
  doc.text('Summary', 20, 65);
  doc.setFontSize(12);
  doc.text(`Total Revenue: ₹${data.summary.totalRevenue.toLocaleString()}`, 20, 80);
  doc.text(`Total Sales: ${data.summary.totalSales}`, 20, 90);
  doc.text(`Total Listings: ${data.summary.totalListings}`, 20, 100);
  
  return Buffer.from(doc.output('arraybuffer'));
}

async function generateSalesExcel(data) {
  const workbook = new ExcelJS.Workbook();
  
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Sales Report']);
  summarySheet.addRow(['Farmer:', data.farmer]);
  summarySheet.addRow(['Generated:', data.generatedAt.toLocaleDateString()]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Revenue:', data.summary.totalRevenue]);
  summarySheet.addRow(['Total Sales:', data.summary.totalSales]);
  summarySheet.addRow(['Total Listings:', data.summary.totalListings]);
  
  const cropsSheet = workbook.addWorksheet('Crops');
  cropsSheet.addRow(['Name', 'Category', 'Status', 'Price', 'Quantity', 'Date']);
  data.crops.forEach(crop => {
    cropsSheet.addRow([
      crop.name,
      crop.category,
      crop.status,
      crop.price.value,
      `${crop.quantity.value} ${crop.quantity.unit}`,
      crop.updatedAt.toLocaleDateString()
    ]);
  });
  
  return await workbook.xlsx.writeBuffer();
}

async function generateSensorPDF(data) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Sensor Data Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Farmer: ${data.farmer}`, 20, 35);
  doc.text(`Generated: ${data.generatedAt.toLocaleDateString()}`, 20, 45);
  doc.text(`Sensors: ${data.sensorsCount}`, 20, 55);
  
  return Buffer.from(doc.output('arraybuffer'));
}

async function generateSensorExcel(data) {
  const workbook = new ExcelJS.Workbook();
  
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Sensor Data Report']);
  summarySheet.addRow(['Farmer:', data.farmer]);
  summarySheet.addRow(['Generated:', data.generatedAt.toLocaleDateString()]);
  summarySheet.addRow(['Sensors Count:', data.sensorsCount]);
  
  return await workbook.xlsx.writeBuffer();
}

async function generateComprehensivePDF(data) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Comprehensive Farm Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Farmer: ${data.farmer}`, 20, 35);
  doc.text(`Generated: ${data.generatedAt.toLocaleDateString()}`, 20, 45);
  doc.text(`Period: ${data.period}`, 20, 55);
  
  return Buffer.from(doc.output('arraybuffer'));
}

async function generateComprehensiveExcel(data) {
  const workbook = new ExcelJS.Workbook();
  
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Comprehensive Farm Report']);
  summarySheet.addRow(['Farmer:', data.farmer]);
  summarySheet.addRow(['Generated:', data.generatedAt.toLocaleDateString()]);
  summarySheet.addRow(['Period:', data.period]);
  
  return await workbook.xlsx.writeBuffer();
}

module.exports = router;