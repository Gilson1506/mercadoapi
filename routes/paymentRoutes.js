import express from 'express';
import {
    processPayment,
    handleWebhook,
    getPaymentStatus,
    getInstallments
} from '../controllers/paymentController.js';

const router = express.Router();

// Processar pagamento (cartão, pix, boleto)
router.post('/process', processPayment);

// Webhook para notificações do Mercado Pago
router.post('/webhook', handleWebhook);

// Consultar status de um pagamento
router.get('/:id', getPaymentStatus);

// Obter opções de parcelamento
router.get('/installments/:amount', getInstallments);

export default router;
