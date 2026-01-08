import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

async function testPaymentWithDetails() {
    console.log('🧪 TESTE COMPLETO - Mercado Pago\n');
    console.log('📋 Checklist:');
    console.log('   ✓ CPF sanitizado (apenas dígitos)');
    console.log('   ✓ Sem notification_url (ambiente de teste)');
    console.log('   ✓ Email diferente do vendedor');
    console.log('   ✓ Credenciais de teste\n');

    const paymentData = {
        transaction_amount: 100,
        description: 'Teste - Ingresso',
        payment_method_id: 'pix',
        external_reference: `TEST_${Date.now()}`,
        payer: {
            email: 'comprador.teste.2024@outlook.com',
            identification: {
                type: 'CPF',
                number: '12345678909' // Apenas dígitos
            }
        }
        // SEM notification_url para teste
    };

    console.log('📤 Payload enviado:');
    console.log(JSON.stringify(paymentData, null, 2));
    console.log('\n---\n');

    try {
        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `test_${Date.now()}`
            },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();
        const requestId = response.headers.get('x-request-id');

        console.log('📊 RESPOSTA:\n');
        console.log('HTTP Status:', response.status);
        console.log('x-request-id:', requestId || 'N/A');
        console.log('\n📄 Body:');
        console.log(JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('\n✅ SUCESSO!');
            console.log('   ID:', result.id);
            console.log('   Status:', result.status);
            console.log('   Método:', result.payment_method_id);

            if (result.point_of_interaction?.transaction_data) {
                console.log('\n🎉 QR Code Pix gerado!');
                console.log('   QR Code:', result.point_of_interaction.transaction_data.qr_code?.substring(0, 50) + '...');
            }
        } else {
            console.log('\n❌ ERRO');

            if (result.cause) {
                console.log('\n📋 Detalhes:');
                result.cause.forEach((c, i) => {
                    console.log(`   ${i + 1}. [${c.code}] ${c.description}`);
                });
            }

            // Diagnóstico
            console.log('\n🔍 Diagnóstico:');
            if (result.message?.includes('Unauthorized use of live credentials')) {
                console.log('   ⚠️ Credenciais de PRODUÇÃO sendo usadas em ambiente de TESTE');
                console.log('   → Ative as credenciais de teste no painel do Mercado Pago');
            } else if (result.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
                console.log('   ⚠️ PolicyAgent bloqueou a transação');
                console.log('   → Possíveis causas:');
                console.log('      • Email/CPF vinculado à conta vendedor');
                console.log('      • Credenciais não ativadas corretamente');
                console.log('      • Conta com restrições');
            }
        }

        console.log('\n---\n');
        console.log('📌 Ambiente:', process.env.NODE_ENV || 'development');
        console.log('📌 Tipo de credencial:', ACCESS_TOKEN?.startsWith('TEST-') ? 'TEST' : 'PRODUÇÃO');

    } catch (error) {
        console.log('❌ Erro na requisição:', error.message);
    }
}

testPaymentWithDetails();
