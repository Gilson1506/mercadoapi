import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

async function testCredentials() {
    console.log('🔍 Testando credenciais do Mercado Pago...\n');

    // Teste 1: Verificar se o token é válido
    try {
        const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });

        if (response.ok) {
            console.log('✅ Token válido!');
            const data = await response.json();
            console.log(`   Métodos de pagamento disponíveis: ${data.length}`);
        } else {
            console.log('❌ Token inválido ou expirado');
            console.log('   Status:', response.status);
        }
    } catch (error) {
        console.log('❌ Erro ao validar token:', error.message);
    }

    console.log('\n---\n');

    // Teste 2: Tentar criar um pagamento de teste simples
    try {
        console.log('🧪 Tentando criar pagamento de teste...\n');

        const paymentData = {
            transaction_amount: 100,
            description: 'Teste de integração',
            payment_method_id: 'pix',
            payer: {
                email: 'test_user_123456@testuser.com',
                identification: {
                    type: 'CPF',
                    number: '12345678909'
                }
            }
        };

        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Pagamento criado com sucesso!');
            console.log('   ID:', result.id);
            console.log('   Status:', result.status);
        } else {
            console.log('❌ Erro ao criar pagamento:');
            console.log('   Status:', response.status);
            console.log('   Erro:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.log('❌ Erro na requisição:', error.message);
    }
}

testCredentials();
