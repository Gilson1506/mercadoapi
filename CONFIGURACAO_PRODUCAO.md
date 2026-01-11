# Guia de Configuração - Produção Mercado Pago

## 🎯 O que o suporte explicou:

**Problema identificado:**
- Tokens `TEST-` da conta REAL **NÃO** funcionam para pagamentos reais
- Eles só servem para **simular** com dados de teste
- Para produção, você DEVE usar tokens `APP_USR-`

---

## ✅ Checklist de Configuração para PRODUÇÃO

### 1. Verificar no Painel do Mercado Pago

Acesse: https://www.mercadopago.com.br/developers/panel/app

**Verifique:**
- [ ] Aplicação está em modo **"Produção"** (não "Teste")
- [ ] Chave PIX está **ativa** na sua conta
- [ ] Email da conta é o mesmo que recebe via Links de Pagamento

### 2. Pegar Credenciais de PRODUÇÃO

Na seção **"Credenciais de Produção"**:

- [ ] Copiar **Access Token** (começa com `APP_USR-`)
- [ ] Copiar **Public Key** (começa com `APP_USR-`)

### 3. Atualizar Backend (.env)

```env
# Mercado Pago Configuration - PRODUÇÃO
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Server Configuration
PORT=3001

# Webhook URL (DEVE ser HTTPS público)
WEBHOOK_URL=https://mercadoapi.onrender.com/api/payments/webhook

# Environment
NODE_ENV=production

# Webhook Secret
MERCADOPAGO_WEBHOOK_SECRET=268acc155529c928a31181f33e06c5cfb8a40b2ad4923dd41e3714cd7fe525ef
```

### 4. Atualizar Frontend (.env)

```env
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_MERCADOPAGO_API_URL=https://mercadoapi.onrender.com/api/payments
```

### 5. Atualizar Render (Environment Variables)

No painel do Render, atualize:

```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx...
NODE_ENV=production
```

### 6. Validações Essenciais

Antes de testar:

- [ ] Header Authorization: `Bearer APP_USR-xxxxxxxx`
- [ ] App em **"Produção"** no painel
- [ ] Token da **MESMA conta** dos Links de Pagamento
- [ ] Chave PIX **ativa** na conta
- [ ] Endpoint: `https://api.mercadopago.com/v1/payments`
- [ ] notification_url é HTTPS público

---

## 🧪 Teste de Validação

Depois de configurar, rode:

```bash
cd mercadopagoapi
node test-diagnostico-suporte.js
```

**Resultado esperado:**
- ✅ GET /users/me → 200 OK
- ✅ POST /v1/payments (PIX) → 201 Created (ou 200 OK)

---

## ⚠️ IMPORTANTE

**PRODUÇÃO = PAGAMENTOS REAIS**

- ✅ Use dados reais de clientes
- ✅ Pagamentos serão cobrados de verdade
- ✅ Dinheiro vai para sua conta
- ❌ NÃO use cartões de teste
- ❌ NÃO use CPF 12345678909

---

## 🔍 Se ainda der erro 401

Envie ao suporte:

1. **Primeiros 8 caracteres do token:** `APP_USR-`
2. **Print da aplicação** mostrando "Em produção"
3. **Confirmação:** Email da conta do token = Email dos Links de Pagamento
4. **Status da chave PIX:** Ativa ou não

---

## 📞 Falar com Atendente

Se precisar de ajuda humana:
https://www.mercadopago.com.br/developers/pt/support
