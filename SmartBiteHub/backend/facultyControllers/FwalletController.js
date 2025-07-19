import fwallet from '../facultyModels/fwalletModel.js';
import facultyModels from '../facultyModels/facultyModel.js';

// Get Wallet Balance (using logged-in user's email)
const getWalletBalance = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const wallet = await fwallet.findOne({ email });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ success: false, message: 'Error fetching wallet balance' });
  }
};

// Recharge Wallet (Admin Only)
const rechargeWallet = async (req, res) => {
  const { email, amount } = req.body;

  if (amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
  }

  try {
    const wallet = await fwallet.findOne({ email });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    wallet.balance += amount;
    await wallet.save();

    res.json({ success: true, newBalance: wallet.balance });
  } catch (error) {
    console.error('Error recharging wallet:', error);
    res.status(500).json({ success: false, message: 'Error recharging wallet' });
  }
};

// Deduct Wallet Balance
const deductWalletBalance = async (req, res) => {
  const { email, amount } = req.body;

  if (amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
  }

  try {
    const wallet = await fwallet.findOne({ email });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    wallet.balance -= amount;
    await wallet.save();

    res.json({ success: true, newBalance: wallet.balance });
  } catch (error) {
    console.error('Error deducting wallet balance:', error);
    res.status(500).json({ success: false, message: 'Error deducting wallet balance' });
  }
};

export { getWalletBalance, rechargeWallet, deductWalletBalance };