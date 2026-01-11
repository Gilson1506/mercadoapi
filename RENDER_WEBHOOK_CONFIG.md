# Configuração do Webhook - Render + Mercado Pago

## ✅ URL do Webhook Configurada

```
https://mercadoapi.onrender.com/api/payments/webhook
```

---

## 📋 Checklist de Configuração

### 1. Variáveis de Ambiente no Render

Acesse o painel do Render e configure:

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-784280626350811-010707-da34b0fc11f8fdbaab4a827458682c59-2482675969
PORT=3001
WEBHOOK_URL=https://mercadoapi.onrender.com/api/payments/webhook
NODE_ENV=production
MERCADOPAGO_WEBHOOK_SECRET=268acc155529c928a31181f33e06c5cfb8a40b2ad4923dd41e3714cd7fe525ef
```

### 2. Cadastrar Webhook no Mercado Pago

1. **Acesse:** https://www.mercadopago.com.br/developers/panel/app
2. **Selecione sua aplicação**
3. **Vá em "Webhooks"** ou **"Notificações"**
4. **Clique em "Configurar notificações"**
5. **Adicione a URL:**
   ```
   https://mercadoapi.onrender.com/api/payments/webhook
   ```
6. **Selecione os eventos:**
   - ✅ Pagamentos (payments)
   - ✅ Chargebacks
   - ✅ Merchant orders

7. **Salve a configuração**

### 3. Atualizar Frontend (.env)

No arquivo `.env` do frontend (`pulacatracacliente`):

```env
VITE_MERCADOPAGO_API_URL=https://mercadoapi.onrender.com/api/payments
```

---

## 🧪 Testar Webhook

Após configurar, teste fazendo um pagamento Pix:

1. Faça uma compra no site
2. Gere o QR Code Pix
3. Pague o Pix (ou aguarde expirar)
4. Verifique os logs no Render:
   - Deve aparecer: `🔔 Webhook recebido`

---

## ⚠️ Importante

- **Render Free Tier:** O serviço hiberna após 15min de inatividade
- **Primeira requisição:** Pode demorar 30-60s para "acordar"
- **Solução:** Upgrade para plano pago ou usar outro serviço (Railway, Fly.io)

---

## 🔧 Próximos Passos

1. [ ] Configurar variáveis no Render
2. [ ] Cadastrar webhook no painel do MP
3. [ ] Atualizar `.env` do frontend
4. [ ] Testar pagamento completo
5. [ ] Verificar logs do webhook
