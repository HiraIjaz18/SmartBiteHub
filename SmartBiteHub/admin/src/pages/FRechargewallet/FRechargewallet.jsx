import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
export const url = "http://localhost:4000";
import './FRechargewallet.css'; // Import CSS for styling

const FRechargeWallet = () => {
  const [email, setEmail] = useState(''); // Email for wallet recharge
  const [amount, setAmount] = useState(0); // Amount for wallet recharge

  const rechargeWallet = async (e) => {
    e.preventDefault();
    
    // Check if amount is a positive number
    if (amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    try {
      const response = await axios.post(`${url}/api/Fwallets/frecharge`, {
        email,
        amount,
      });

      if (response.data.success) {
        const newBalance = response.data.newBalance;
        toast.success(`Wallet recharged successfully. New balance: ${newBalance}`);
        setEmail('');
        setAmount(0);
      } else {
        toast.error("Failed to recharge wallet");
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Error recharging wallet";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="frecharge-wallet">
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
          onChange={(e) => setAmount(parseInt(e.target.value))} // Ensure `amount` is a number
          min="1"
          required
        />
        <button type="submit">Recharge Wallet</button>
      </form>
    </div>
  );
};

export default FRechargeWallet;
