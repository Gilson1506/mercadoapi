# Resposta para Suporte Mercado Pago - Erro 401

## 📋 Informações Solicitadas

### 1. Base URL e Endpoint

```
POST https://api.mercadopago.com/v1/payments
```

### 2. Header Authorization

```
Authorization: Bearer TEST-784280626350811-010707-da34b0fc...682c59-2482675969
```

**Tipo:** Credencial de TESTE (começa com `TEST-`)

### 3. Public Key (Frontend)

```
TEST-ee1785fb-7b70-46b7-a082-67f857861eed
```

**Tipo:** Credencial de TESTE (começa com `TEST-`)

### 4. Usuários

**Vendedor (autenticação):**
- Conta REAL (não é usuário de teste)
- User ID da credencial: `2482675969`

**Pagador (comprador):**
- Email de teste: `comprador.teste.2024@outlook.com`
- CPF de teste: `12345678909`

---

## 🔍 Checks Realizados

✅ **Public Key e Access Token:** Ambos são `TEST-` (mesma aplicação)  
✅ **Endpoint:** Usando URL correta `https://api.mercadopago.com/v1/payments`  
✅ **Dados do pagador:** Email e CPF fictícios (não vinculados ao vendedor)  
❌ **PROBLEMA IDENTIFICADO:** Credenciais de teste não ativadas

---

## ⚠️ Erro Recebido

```json
{
  "status": 401,
  "error": "unauthorized",
  "message": "Unauthorized use of live credentials",
  "cause": [
    {
      "code": 7,
      "description": "Unauthorized use of live credentials"
    }
  ]
}
```

**x-request-id:** `1d0ebeef-8e93-4b12-ae8b-526c3f3656a9`

---

## 🎯 Situação Atual

Estou usando credenciais que **começam com TEST-** mas recebo erro dizendo que são "live credentials".

**Hipótese:** As credenciais de teste não foram ativadas no painel da aplicação.

**Pergunta para o suporte:**
> Como ativar corretamente as credenciais de teste? Existe algum botão/toggle específico que preciso habilitar no painel da aplicação?

---

## 📄 Payload Completo (Exemplo)

```json
{
  "transaction_amount": 100,
  "description": "Teste - Ingresso",
  "payment_method_id": "pix",
  "external_reference": "TEST_1767890133441",
  "payer": {
    "email": "comprador.teste.2024@outlook.com",
    "identification": {
      "type": "CPF",
      "number": "12345678909"
    }
  }
}
```

**Headers:**
```
Authorization: Bearer TEST-784280626350811-010707-da34b0fc...682c59-2482675969
Content-Type: application/json
X-Idempotency-Key: test_1767890133441
```

---

## 🔧 Ambiente

- **Aplicação:** Conta real (não usuário de teste)
- **Credenciais:** TEST (ambiente sandbox)
- **SDK:** mercadopago@latest (Node.js)
- **Objetivo:** Testar integração antes de ir para produção
