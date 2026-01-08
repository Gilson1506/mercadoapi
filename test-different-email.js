import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

async function testWithDifferentEmail() {
    console.log('🧪 TESTE: Usando email COMPLETAMENTE diferente\n');

    const paymentData = {
        transaction_amount: 100,
        description: 'Teste de integração',
        payment_method_id: 'pix',
        payer: {
            email: 'comprador.teste.2024@outlook.com', // EMAIL DIFERENTE
            identification: {
                type: 'CPF',
                number: '12345678909' // CPF de teste
            }
        }
    };

    console.log('📤 Dados enviados:');
    console.log(JSON.stringify(paymentData, null, 2));
    console.log('\n---\n');

    try {
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
            console.log('✅ SUCESSO! Pagamento criado!');
            console.log('   ID:', result.id);
            console.log('   Status:', result.status);
            console.log('\n🎉 O problema ERA o email mussolab@gmail.com!');
        } else {
            console.log('❌ Erro:', response.status);
            console.log('   Detalhes:', JSON.stringify(result, null, 2));

            if (result.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
                console.log('\n⚠️ Ainda bloqueado! Possíveis causas:');
                console.log('   1. Credenciais não ativadas');
                console.log('   2. Token de produção (não teste)');
                console.log('   3. Conta com restrições');
            }
        }
    } catch (error) {
        console.log('❌ Erro na requisição:', error.message);
    }
}

testWithDifferentEmail();
