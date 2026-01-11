import { createClient } from '@supabase/supabase-js';

// Função auxiliar para obter cliente Supabase
function getSupabaseClient() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('⚠️ Supabase não configurado. SUPABASE_SERVICE_ROLE_KEY é necessária para webhooks.');
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Processar pagamento aprovado
 */
export async function handlePaymentApproved(paymentData) {
    const { id, status, external_reference, transaction_amount, payment_method_id } = paymentData;

    console.log(`✅ PAGAMENTO APROVADO! ID: ${id}`);
    console.log(`💳 Método: ${payment_method_id}`);
    console.log(`💰 Valor: R$ ${transaction_amount}`);
    console.log(`🔗 Referência: ${external_reference}`);

    try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        // 1. Buscar order pelo external_reference (order_code)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_code', external_reference)
            .single();

        if (orderError && orderError.code !== 'PGRST116') {
            console.error('❌ Erro ao buscar order:', orderError);
            return;
        }

        if (!order) {
            console.log('⚠️ Order não encontrado com order_code:', external_reference);
            return;
        }

        console.log(`💰 Valor total da ordem: R$ ${order.total_amount}`);

        // 2. Atualizar status do order para paid
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                payment_status: 'paid',
                mercadopago_payment_id: id.toString(),
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

        if (updateError) {
            console.error('❌ Erro ao atualizar order:', updateError);
        } else {
            console.log('✅ Order atualizado para paid:', order.id);
        }

        // 3. Buscar transactions pendentes
        console.log(`🔍 Buscando transactions pendentes para order_id: ${order.id}`);

        const { data: existingTrx } = await supabase
            .from('transactions')
            .select('id, mercadopago_payment_id, status, amount, order_id')
            .eq('order_id', order.id);

        console.log(`🔍 Transactions existentes:`, existingTrx?.length || 0);
        if (existingTrx) {
            existingTrx.forEach(t => {
                console.log(`   - ID: ${t.id}, Status: ${t.status}, Amount: R$ ${t.amount}, MP ID: ${t.mercadopago_payment_id}`);
            });
        }

        // 4. Atualizar transactions para completed
        const { data: updatedTransactions, error: transactionError } = await supabase
            .from('transactions')
            .update({
                status: 'completed',
                mercadopago_payment_id: id.toString(),
                paid_at: paymentData.date_approved || new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('order_id', order.id)
            .eq('status', 'pending')
            .select();

        if (transactionError) {
            console.error('❌ Erro ao atualizar transactions:', transactionError);
        } else {
            console.log(`✅ ${updatedTransactions?.length || 0} transactions atualizadas para completed`);
            if (updatedTransactions && updatedTransactions.length > 0) {
                updatedTransactions.forEach(t => {
                    console.log(`   - Atualizada: ID ${t.id}, Amount: R$ ${t.amount}`);
                });
            }
        }

        // 5. Gerar tickets automaticamente APENAS SE ATUALIZOU TRANSACTIONS
        if (updatedTransactions && updatedTransactions.length > 0) {
            console.log('🎫 Gerando tickets para transactions recém-atualizadas...');

            const orderMetadata = order.metadata || {};
            const orderItems = orderMetadata.items || [];

            if (orderItems.length > 0) {
                const ticketsRows = [];

                orderItems.forEach((item) => {
                    const qty = Number(item.quantity || 1);
                    const unitReais = Number((item.amount / 100).toFixed(2));

                    for (let i = 0; i < qty; i++) {
                        const qrCodeTicket = `PLKTK_${order.event_id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                        ticketsRows.push({
                            user_id: order.user_id,
                            event_id: order.event_id,
                            price: unitReais,
                            status: 'active',
                            qr_code: qrCodeTicket,
                            ticket_type: item.name || item.description || 'Ingresso',
                            metadata: {
                                order_id: order.id,
                                mercadopago_payment_id: id.toString(),
                                payment_method: payment_method_id,
                                item: {
                                    code: item.code,
                                    amount_cents: item.amount
                                }
                            }
                        });
                    }
                });

                if (ticketsRows.length > 0) {
                    const { data: ticketsInserted, error: ticketsErr } = await supabase
                        .from('tickets')
                        .insert(ticketsRows)
                        .select('id, status, qr_code');

                    if (ticketsErr) {
                        console.error('❌ Erro ao criar tickets:', ticketsErr);
                    } else {
                        console.log(`✅ ${ticketsInserted?.length || 0} tickets gerados automaticamente pelo webhook!`);
                    }
                }
            }
        } else {
            console.log('ℹ️ Nenhuma transaction foi atualizada (pagamento já processado anteriormente)');
            console.log('ℹ️ Tickets já devem existir - pulando geração de tickets');
        }

    } catch (error) {
        console.error('❌ Erro ao processar pagamento aprovado:', error);
    }
}

/**
 * Processar pagamento rejeitado
 */
export async function handlePaymentRejected(paymentData) {
    const { id, status, status_detail, external_reference } = paymentData;

    console.log(`❌ PAGAMENTO REJEITADO! ID: ${id}`);
    console.log(`🚫 Motivo: ${status_detail}`);
    console.log(`🔗 Referência: ${external_reference}`);

    try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        // Buscar order pelo external_reference
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('order_code', external_reference)
            .single();

        if (order) {
            // Atualizar status do order para failed
            await supabase
                .from('orders')
                .update({
                    payment_status: 'failed',
                    mercadopago_payment_id: id.toString(),
                    mercadopago_status: status_detail,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            console.log('✅ Order atualizado para failed:', order.id);

            // Atualizar transactions
            await supabase
                .from('transactions')
                .update({
                    status: 'failed',
                    mercadopago_payment_id: id.toString(),
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', order.id)
                .eq('status', 'pending');

            console.log('✅ Transactions atualizadas para failed');
        }
    } catch (error) {
        console.error('❌ Erro ao processar pagamento rejeitado:', error);
    }
}

/**
 * Processar pagamento pendente
 */
export async function handlePaymentPending(paymentData) {
    const { id, status, external_reference } = paymentData;

    console.log(`⏳ PAGAMENTO PENDENTE! ID: ${id}`);
    console.log(`📊 Status: ${status}`);
    console.log(`🔗 Referência: ${external_reference}`);

    try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        // Buscar order pelo external_reference
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('order_code', external_reference)
            .single();

        if (order) {
            // Atualizar order com ID do Mercado Pago
            await supabase
                .from('orders')
                .update({
                    mercadopago_payment_id: id.toString(),
                    mercadopago_status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            console.log('✅ Order atualizado com ID do Mercado Pago:', order.id);
        }
    } catch (error) {
        console.error('❌ Erro ao processar pagamento pendente:', error);
    }
}
