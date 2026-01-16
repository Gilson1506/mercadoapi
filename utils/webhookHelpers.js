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

        // ✅ Atualizar transactions para completed
        const { data: updatedTransactions, error: transactionError } = await supabase
            .from('transactions')
            .update({
                status: 'completed',
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
        }

        // 🎫 Gerar tickets (1 por transaction)
        if (updatedTransactions && updatedTransactions.length > 0) {
            console.log('🎫 Gerando tickets...');

            const ticketsRows = updatedTransactions.map(trx => {
                const qrCodeTicket = `PLKTK_${order.event_id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                return {
                    user_id: order.user_id,
                    event_id: order.event_id,
                    price: trx.amount, // Usar amount da transaction (valor unitário)
                    status: 'active',
                    qr_code: qrCodeTicket,
                    ticket_type: trx.metadata?.item?.name || 'Ingresso',
                    metadata: {
                        order_id: order.id,
                        transaction_id: trx.id,
                        mercadopago_payment_id: id.toString(),
                        payment_method: payment_method_id,
                        item: trx.metadata?.item
                    }
                };
            });

            const { data: ticketsInserted, error: ticketsErr } = await supabase
                .from('tickets')
                .insert(ticketsRows)
                .select('id, status, qr_code');

            if (ticketsErr) {
                console.error('❌ Erro ao criar tickets:', ticketsErr);
            } else {
                console.log(`✅ ${ticketsInserted?.length || 0} tickets gerados automaticamente!`);
            }
        } else {
            console.log('ℹ️ Nenhuma transaction pendente para gerar tickets');
        }



        // 🔗 Processar comissão de afiliado
        const affiliateCode = paymentData.metadata?.affiliate_code || paymentData.additional_info?.metadata?.affiliate_code;

        if (affiliateCode) {
            console.log(`🔗 Código de afiliado detectado para confirmação: ${affiliateCode}`);

            // 1. Buscar afiliado
            const { data: affiliate } = await supabase
                .from('affiliates')
                .select('id')
                .eq('affiliate_code', affiliateCode)
                .single();

            if (affiliate) {
                // 2. Buscar venda pendente para este evento
                const { data: pendingSale } = await supabase
                    .from('affiliate_sales')
                    .select('id')
                    .eq('affiliate_id', affiliate.id)
                    .eq('event_id', order.event_id)
                    .eq('commission_status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (pendingSale) {
                    console.log('✅ Venda de afiliado pendente encontrada. Confirmando...');

                    // 3. Confirmar comissão e vincular transaction
                    await supabase
                        .from('affiliate_sales')
                        .update({
                            commission_status: 'paid',
                            transaction_id: updatedTransactions?.[0]?.id,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', pendingSale.id);

                    console.log(`✅ Comissão de afiliado confirmada: ${affiliateCode}`);
                }
            }
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
