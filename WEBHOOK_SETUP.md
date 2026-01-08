# Guia de Configuração - Webhook Mercado Pago

## ⚠️ Problema Identificado

URLs temporárias de túnel (serveo, localtunnel, ngrok gratuito) são **bloqueadas** pelo Mercado Pago por questões de segurança.

## ✅ Solução para Produção

### 1. Configurar Domínio com HTTPS

Você precisa de um domínio próprio com certificado SSL válido:

```
https://seudominio.com.br/api/payments/webhook
```

**Opções:**
- Vercel/Netlify (gratuito, HTTPS automático)
- Railway/Render (gratuito, HTTPS automático)
- VPS próprio com Let's Encrypt

### 2. Cadastrar no Painel do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em **"Webhooks"**
4. Clique em **"Configurar notificações"**
5. Adicione a URL: `https://seudominio.com.br/api/payments/webhook`
6. Selecione os eventos:
   - ✅ Pagamentos
   - ✅ Chargebacks
   - ✅ Merchant orders

### 3. Atualizar `.env`

```env
WEBHOOK_URL=https://seudominio.com.br/api/payments/webhook
```

## 🧪 Para Testes (Ambiente Local)

**Opção 1: Desabilitar webhook temporariamente**
- Remova `notification_url` do payload
- Consulte status manualmente via API

**Opção 2: Usar ngrok pago**
- Ngrok Pro tem domínio fixo
- Configurar no painel do MP

**Opção 3: Deploy temporário**
- Faça deploy do backend em Vercel/Railway
- Use a URL HTTPS gerada

## 📋 Checklist de Validação

Antes de testar em produção:

- [ ] Domínio com HTTPS válido
- [ ] URL cadastrada no painel do MP
- [ ] Webhook secret configurado
- [ ] Endpoint `/webhook` respondendo 200
- [ ] Logs configurados para debug
- [ ] Validação de assinatura implementada

## 🔧 Código Atual (Corrigido)

O backend agora:
- ✅ Remove `notification_url` se não for HTTPS
- ✅ Sanitiza CPF (apenas dígitos)
- ✅ Log detalhado de erros com x-request-id
- ✅ Identifica bloqueios do PolicyAgent

## 🎯 Próximos Passos

1. **Ativar credenciais de teste** no painel do MP
2. **Testar sem webhook** (remover notification_url)
3. **Configurar domínio HTTPS** para produção
4. **Cadastrar webhook** no painel
5. **Testar com webhook** ativo
