import walletModel from "../models/walletModel.js";
import studentModel from "../models/studentModel.js";

// Get Wallet Balance (using logged-in user's email)
const getWalletBalance = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    // Fetch wallet using email
    const wallet = await walletModel.findOne({ email });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    console.log(`Wallet balance for ${email}:`, wallet.balance);

    res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ success: false, message: 'Error fetching wallet balance' });
  }
};

// Recharge Wallet (Admin Only)
const rechargeWallet = async (req, res) => {
  const { email, amount } = req.body;

  // Check if amount is valid
  if (amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
  }

  try {
    // Find wallet by email
    const wallet = await walletModel.findOne({ email });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Add the amount to the wallet balance
    wallet.balance += amount;
    await wallet.save();

    res.json({ success: true, newBalance: wallet.balance });
  } catch (error) {
    console.error('Error recharging wallet:', error);
    res.status(500).json({ success: false, message: 'Error recharging wallet' });
  }
};
const deductWalletBalance = async (req, res) => {
  const { email, amount } = req.body;

  // Validate amount
  if (amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
  }

  try {
    console.log(`Attempting to deduct wallet balance for email: ${email}`);
    
    // Fetch wallet
    const wallet = await walletModel.findOne({ email });
    if (!wallet) {
      console.error('Wallet not found for email:', email);
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    console.log(`Wallet found with balance: ${wallet.balance}`);

    // Check if balance is sufficient
    if (wallet.balance < amount) {
      console.error('Insufficient balance');
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Deduct balance
    wallet.balance -= amount;
    await wallet.save();

    console.log(`New balance after deduction: ${wallet.balance}`);

    res.json({ success: true, newBalance: wallet.balance });
  } catch (error) {
    console.error('Error deducting wallet balance:', error);
    res.status(500).json({ success: false, message: 'Error deducting wallet balance' });
  }
};

export { getWalletBalance, rechargeWallet, deductWalletBalance };