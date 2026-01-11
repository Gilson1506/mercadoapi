import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

async function createTestUser() {
    console.log('🧪 Criando Usuário de Teste no Mercado Pago\n');
    console.log('═══════════════════════════════════════\n');

    const url = 'https://api.mercadopago.com/users/test_user';
    const payload = {
        site_id: 'MLB'
    };

    console.log('📤 POST', url);
    console.log('Authorization: Bearer', ACCESS_TOKEN.substring(0, 20) + '...' + ACCESS_TOKEN.slice(-10));
    console.log('\nPayload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n---\n');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        console.log('📊 RESPOSTA:\n');
        console.log('HTTP Status:', response.status);
        console.log('\n📄 Body:');
        console.log(JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('\n✅ SUCESSO! Usuário de teste criado!');
            console.log('\n📋 Dados do usuário:');
            console.log('   ID:', result.id);
            console.log('   Nickname:', result.nickname);
            console.log('   Email:', result.email);
            console.log('   Password:', result.password);
            console.log('   Site ID:', result.site_id);
        } else {
            console.log('\n❌ ERRO ao criar usuário de teste');

            if (result.message) {
                console.log('   Mensagem:', result.message);
            }

            if (result.cause) {
                console.log('\n📋 Detalhes:');
                result.cause.forEach((c, i) => {
                    console.log(`   ${i + 1}. [${c.code}] ${c.description}`);
                });
            }
        }

    } catch (error) {
        console.log('❌ Erro na requisição:', error.message);
    }
}

createTestUser();
