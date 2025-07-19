import express from 'express';
import { getWalletBalance,  rechargeWallet,deductWalletBalance} from '../facultyControllers/FwalletController.js';
const FwalletRouter = express.Router();

FwalletRouter.get('/Fbalance',getWalletBalance);
FwalletRouter.post('/frecharge', rechargeWallet);
FwalletRouter.post("/Fwallet/deduct", deductWalletBalance);

export default FwalletRouter;