import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
export const url = "http://localhost:4000";
import './RechargeWallet.css';

const RechargeWallet = () => {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(0);

  const rechargeWallet = async (e) => {
    e.preventDefault();

    if (amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    try {
      const response = await axios.post(`${url}/api/wallets/recharge`, { email, amount });

      if (response.data.success) {
        toast.success(`Wallet recharged successfully. New balance: ${response.data.newBalance}`);
        setEmail('');
        setAmount(0);
      } else {
        toast.error("Failed to recharge wallet");
      }
    } catch (err) {
      console.error("Error recharging wallet:", err);
      toast.error(err.response?.data?.message || "Error recharging wallet");
    }
  };

  return (
    <div className="recharge-wallet">
      <h4>Recharge Wallet</h4>
      <form onSubmit={rechargeWallet}>
        <input
          type="email"
          placeholder="Enter user email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value, 10))}
          min="1"
          required
        />
        <button type="submit">Recharge Wallet</button>
      </form>
    </div>
  );
};

export default RechargeWallet;
