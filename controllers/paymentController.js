import { MercadoPagoConfig, Payment } from 'mercadopago';

// Configurar cliente do Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000 }
});

const payment = new Payment(client);

// 🆕 Cache de webhooks processados (idempotência)
const processedWebhooks = new Set();

/**
 * Processar pagamento (Cartão, Pix, Boleto)
 */
export const processPayment = async (req, res) => {
    try {
        const {
            paymentMethod, // 'credit_card', 'pix', 'boleto'
            amount,
            token, // Token do cartão (apenas para cartão)
            installments,
            email,
            cpf,
            firstName,
            lastName,
            description,
            externalReference,
            address, // Necessário para boleto
            payer,          // 🆕 Dados completos do pagador
            device,         // 🆕 Informações do dispositivo
            additional_info // 🆕 Informações adicionais da compra
        } = req.body;

        console.log('💳 Processando pagamento:', { paymentMethod, amount, email });

        // Validações básicas
        if (!amount || !email || !cpf) {
            return res.status(400).json({
                error: 'Dados obrigatórios faltando',
                required: ['amount', 'email', 'cpf']
            });
        }

        // Sanitizar CPF (apenas dígitos)
        const sanitizedCpf = cpf.replace(/\D/g, '');

        let paymentBody = {
            transaction_amount: parseFloat(amount),
            description: description || 'Compra de ingresso',
            external_reference: externalReference || `ORDER_${Date.now()}`,
            payer: payer || {
                email,
                identification: {
                    type: 'CPF',
                    number: sanitizedCpf
                }
            }
        };

        // 🆕 Adicionar device info se fornecido
        if (device) {
            if (device.ip_address) {
                paymentBody.device_id = device.ip_address;
            }
            paymentBody.metadata = {
                ...paymentBody.metadata,
                user_agent: device.user_agent,
                ip_address: device.ip_address,
                platform: device.platform
            };
        }

        // 🆕 Adicionar additional_info se fornecido
        if (additional_info) {
            paymentBody.additional_info = additional_info;
        }

        // Adicionar notification_url apenas se configurado e válido (HTTPS)
        if (process.env.WEBHOOK_URL && process.env.WEBHOOK_URL.startsWith('https://')) {
            paymentBody.notification_url = process.env.WEBHOOK_URL;
            console.log('✅ Webhook URL configurado:', process.env.WEBHOOK_URL);
        } else if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️ WEBHOOK_URL não configurado ou inválido em produção!');
        }

        // Configuração específica por método de pagamento
        switch (paymentMethod) {
            case 'credit_card':
            case 'debit_card':
                if (!token) {
                    return res.status(400).json({ error: 'Token do cartão é obrigatório' });
                }
                paymentBody.token = token;
                paymentBody.installments = installments || 1;
                paymentBody.payment_method_id = req.body.payment_method_id || 'visa';
                break;

            case 'pix':
                paymentBody.payment_method_id = 'pix';
                break;

            case 'boleto':
                paymentBody.payment_method_id = 'bolbradesco';

                // Boleto requer dados completos do pagador
                if (!firstName || !lastName || !address) {
                    return res.status(400).json({
                        error: 'Dados completos do pagador são obrigatórios para boleto',
                        required: ['firstName', 'lastName', 'address']
                    });
                }

                paymentBody.payer.first_name = firstName;
                paymentBody.payer.last_name = lastName;
                paymentBody.payer.address = {
                    zip_code: address.zipCode,
                    street_name: address.street,
                    street_number: address.number,
                    neighborhood: address.neighborhood,
                    city: address.city,
                    federal_unit: address.state
                };
                break;

            default:
                return res.status(400).json({ error: 'Método de pagamento inválido' });
        }

        // Criar pagamento no Mercado Pago
        console.log('📤 Enviando para Mercado Pago:', JSON.stringify(paymentBody, null, 2));

        const response = await payment.create({ body: paymentBody });

        console.log('✅ Resposta do Mercado Pago:', {
            id: response.id,
            status: response.status,
            status_detail: response.status_detail
        });

        // Preparar resposta baseada no método de pagamento
        let responseData = {
            id: response.id,
            status: response.status,
            status_detail: response.status_detail,
            external_reference: response.external_reference
        };

        // Dados específicos para Pix
        if (paymentMethod === 'pix' && response.point_of_interaction?.transaction_data) {
            responseData.pix = {
                qr_code: response.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
                ticket_url: response.point_of_interaction.transaction_data.ticket_url
            };
        }

        // Dados específicos para Boleto
        if (paymentMethod === 'boleto' && response.transaction_details) {
            responseData.boleto = {
                url: response.transaction_details.external_resource_url,
                digitable_line: response.transaction_details.digitable_line,
                barcode: response.transaction_details.barcode?.content
            };
        }

        // Dados do cartão (se aprovado)
        if (paymentMethod === 'credit_card' && response.card) {
            responseData.card = {
                first_six_digits: response.card.first_six_digits,
                last_four_digits: response.card.last_four_digits
            };
        }

        res.json(responseData);

    } catch (error) {
        console.error('❌ Erro ao processar pagamento:', error);

        // Log detalhado para debug
        const errorDetails = {
            status: error.status,
            code: error.code,
            message: error.message,
            cause: error.cause,
            blocked_by: error.cause?.[0]?.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' ? 'PolicyAgent' : undefined
        };

        console.error('📋 Detalhes do erro:', JSON.stringify(errorDetails, null, 2));

        // Tratar erros específicos do Mercado Pago
        if (error.cause) {
            return res.status(error.status || 400).json({
                error: 'Erro ao processar pagamento',
                message: error.message,
                code: error.code,
                details: error.cause,
                blocked_by: errorDetails.blocked_by
            });
        }

        res.status(500).json({
            error: 'Erro ao processar pagamento',
            message: error.message
        });
    }
};

/**
 * Webhook para receber notificações do Mercado Pago
 */
export const handleWebhook = async (req, res) => {
    try {
        const { type, data, topic } = req.body;

        console.log('🔔 Webhook recebido:', { type, topic, data });

        // ✅ RESPONDER 200 OK IMEDIATAMENTE (evita timeout)
        res.sendStatus(200);

        // 🆕 VALIDAR PAYLOAD antes de processar
        if (!type && !topic) {
            console.log('⚠️ Webhook sem type/topic, ignorando');
            return;
        }

        if (!data || !data.id) {
            console.log('⚠️ Webhook sem data.id, ignorando');
            return;
        }

        // 🆕 VERIFICAR SE JÁ PROCESSAMOS (idempotência)
        const paymentId = data.id;
        const cacheKey = `webhook_${paymentId}`;

        if (processedWebhooks.has(cacheKey)) {
            console.log(`ℹ️ Webhook ${paymentId} já processado, ignorando duplicata`);
            return;
        }

        // Marcar como processado (expira em 1 hora)
        processedWebhooks.add(cacheKey);
        setTimeout(() => processedWebhooks.delete(cacheKey), 3600000);

        // ✅ PROCESSAR EM BACKGROUND (não bloqueia resposta)
        setImmediate(async () => {
            try {
                console.log(`⚡ Iniciando processamento em background...`);

                // Processar notificação de pagamento
                if (type === 'payment' || topic === 'payment') {

                    // Consultar detalhes do pagamento
                    const paymentData = await payment.get({ id: paymentId });

                    console.log('💰 Detalhes do pagamento:', {
                        id: paymentData.id,
                        status: paymentData.status,
                        status_detail: paymentData.status_detail,
                        external_reference: paymentData.external_reference,
                        payment_method_id: paymentData.payment_method_id,
                        transaction_amount: paymentData.transaction_amount
                    });

                    // Processar baseado no status
                    switch (paymentData.status) {
                        case 'approved':
                            const { handlePaymentApproved } = await import('../utils/webhookHelpers.js');
                            await handlePaymentApproved(paymentData);
                            break;
                        case 'rejected':
                        case 'cancelled':
                            const { handlePaymentRejected } = await import('../utils/webhookHelpers.js');
                            await handlePaymentRejected(paymentData);
                            break;
                        case 'pending':
                        case 'in_process':
                        case 'in_mediation':
                        case 'authorized':
                            const { handlePaymentPending } = await import('../utils/webhookHelpers.js');
                            await handlePaymentPending(paymentData);
                            break;
                        default:
                            console.log(`ℹ️ Status não tratado: ${paymentData.status}`);
                    }
                }

                console.log(`✅ Processamento em background concluído`);
            } catch (bgError) {
                console.error('❌ Erro no processamento em background:', bgError);
            }
        });

    } catch (error) {
        console.error('❌ Erro ao receber webhook:', error);
        // Mesmo com erro, já respondeu 200 para evitar reenvios
    }
};

/**
 * Consultar status de um pagamento
 */
export const getPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🔍 Consultando pagamento:', id);

        const paymentData = await payment.get({ id: parseInt(id) });

        res.json({
            id: paymentData.id,
            status: paymentData.status,
            status_detail: paymentData.status_detail,
            transaction_amount: paymentData.transaction_amount,
            date_created: paymentData.date_created,
            date_approved: paymentData.date_approved,
            external_reference: paymentData.external_reference
        });

    } catch (error) {
        console.error('❌ Erro ao consultar pagamento:', error);
        res.status(404).json({
            error: 'Pagamento não encontrado',
            message: error.message
        });
    }
};

/**
 * Obter opções de parcelamento
 */
export const getInstallments = async (req, res) => {
    try {
        const { amount } = req.params;

        // 🆕 Taxas atualizadas do Mercado Pago (Janeiro 2026)
        const feePercentages = {
            1: 4.99,   // 1x - crédito à vista
            2: 2.53,   // 2x
            3: 4.62,   // 3x
            4: 6.69,   // 4x
            5: 8.66,   // 5x
            6: 9.96,   // 6x
            7: 11.24,  // 7x
            8: 12.50,  // 8x
            9: 13.73,  // 9x
            10: 14.93, // 10x
            11: 16.12, // 11x
            12: 17.28  // 12x
        };

        const installmentOptions = [];
        const maxInstallments = 12;
        const amountValue = parseFloat(amount);

        for (let i = 1; i <= maxInstallments; i++) {
            const feePercentage = feePercentages[i] || 0;
            const totalWithFee = amountValue * (1 + feePercentage / 100);
            const installmentAmount = totalWithFee / i;

            installmentOptions.push({
                installments: i,
                installment_amount: installmentAmount.toFixed(2),
                total_amount: totalWithFee.toFixed(2),
                fee_percentage: feePercentage,
                original_amount: amountValue.toFixed(2)
            });
        }

        res.json({ installments: installmentOptions });

    } catch (error) {
        console.error('❌ Erro ao calcular parcelamento:', error);
        res.status(500).json({
            error: 'Erro ao calcular parcelamento',
            message: error.message
        });
    }
};
