import express from 'express';
import { getWalletBalance,  rechargeWallet,deductWalletBalance} from '../controllers/walletController.js';
const walletRouter = express.Router();

walletRouter.get('/balance',getWalletBalance);
walletRouter.post('/recharge', rechargeWallet);
walletRouter.post("/wallet/deduct", deductWalletBalance);

export default walletRouter;