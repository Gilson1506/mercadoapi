# Mensagem para Suporte Mercado Pago

## Assunto
**Erro 401 ao criar pagamentos PIX com credenciais de teste - Como habilitar PIX em ambiente sandbox?**

---

## Mensagem

Olá equipe de suporte,

Estou integrando o Mercado Pago na minha aplicação e estou enfrentando um problema ao tentar criar pagamentos PIX usando credenciais de teste.

### 📋 Informações da Conta

- **User ID:** 2482675969
- **Email:** victor.ds.pagliarinivds@gmail.com
- **Nickname:** PAGLIRINI
- **Access Token:** TEST-784280626350811-010707-da34b0fc11f8fdbaab4a827458682c59-2482675969
- **Public Key:** TEST-ee1785fb-7b70-46b7-a082-67f857861eed

### 🔍 Testes Realizados

Executei os testes solicitados pela equipe de suporte:

**1. Validação do Token (GET /users/me)**
```
Status: 200 OK ✅
Resultado: Token válido e autenticado corretamente
```

**2. Pagamento PIX (POST /v1/payments)**
```
Status: 401 Unauthorized ❌
Erro: "Unauthorized use of live credentials"
Código: 7
x-request-id: 48e02602-130f-45da-b230-1d5e5f88dafa
```

**Payload usado:**
```json
{
  "transaction_amount": 10,
  "description": "TEST PIX",
  "payment_method_id": "pix",
  "payer": {
    "email": "test_user_pix@test.com",
    "identification": {
      "type": "CPF",
      "number": "12345678909"
    }
  }
}
```

**3. Criar Usuário de Teste (POST /users/test_user)**
```
Status: 403 Forbidden ❌
Erro: "At least one policy returned UNAUTHORIZED"
blocked_by: "PolicyAgent"
```

### ❓ Problema

O token de teste está **válido** (GET /users/me retorna 200), mas **TODOS os métodos de pagamento** retornam erro 401:

- ❌ **Pagamentos PIX** retornam erro 401 "Unauthorized use of live credentials"
- ❌ **Pagamentos com Cartão** retornam erro 401 "Unauthorized use of live credentials"
- ❌ Criação de usuários de teste retorna erro 403 PolicyAgent
- ✅ O token começa com "TEST-" e foi gerado na seção de credenciais de teste

**Isso indica que as credenciais de teste não estão ativadas ou a conta tem restrições.**

### 🎯 Pergunta

**Como ativar corretamente as credenciais de teste para permitir criar pagamentos?**

Existe alguma configuração no painel da aplicação que preciso ativar para permitir pagamentos PIX em ambiente sandbox/teste?

Já verifiquei:
- ✅ Credenciais são de teste (começam com TEST-)
- ✅ Token está válido
- ✅ Testei com múltiplos emails/CPFs diferentes
- ✅ Endpoint correto: https://api.mercadopago.com/v1/payments

Agradeço a ajuda!

---

**Informações Técnicas Adicionais:**
- SDK: mercadopago@latest (Node.js)
- Ambiente: Desenvolvimento/Teste
- Objetivo: Integração de pagamentos (Pix + Cartão de Crédito)
