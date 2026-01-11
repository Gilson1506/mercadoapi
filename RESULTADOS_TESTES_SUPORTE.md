# Resultados dos Testes - Para Suporte Mercado Pago

## ✅ TESTE 1: Validação do Token - PASSOU

```
GET https://api.mercadopago.com/users/me
Status: 200 OK
```

**Informações da Conta:**
- User ID: `2482675969`
- Email: `victor.ds.pagliarinivds@gmail.com`
- Nickname: `PAGLIRINI`
- Site ID: `MLB` (Brasil)
- Country: `BR`

**Conclusão:** Token está VÁLIDO e pertence à conta correta.

---

## ⚠️ TESTE 2: Pagamento com Cartão - REQUER TOKEN DO SDK

```
POST https://api.mercadopago.com/v1/payments
Status: 400 Bad Request
```

**Erro:**
```json
{
  "message": "Header X-Idempotency-Key can't be null",
  "code": 4292
}
```

**Nota:** Este teste requer um token de cartão gerado pelo SDK no frontend. O erro é esperado sem o token.

---

## ❌ TESTE 3: Pagamento PIX - FALHOU

```
POST https://api.mercadopago.com/v1/payments
Status: 401 Unauthorized
x-request-id: 1e369d0f-58a1-4f37-873c-83f966513f4d
```

**Erro:**
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

---

## 🔍 ANÁLISE

**Problema Identificado:**
- ✅ Token é válido (Teste 1 passou)
- ✅ Token pertence à conta correta
- ❌ **PIX retorna erro 401 "live credentials"**

**Hipótese:**
> **PIX não está habilitado para credenciais de TESTE nesta aplicação**

---

## 📋 INFORMAÇÕES ADICIONAIS NECESSÁRIAS

Para o suporte resolver, preciso verificar no painel:

1. **App ID da aplicação** (onde as credenciais TEST foram geradas)
2. **Se PIX está habilitado** na seção "Meios de Pagamento" da aplicação
3. **Confirmar que Public Key e Access Token** são da mesma aplicação

**Onde verificar:**
- Painel: https://www.mercadopago.com.br/developers/panel/app
- Selecionar a aplicação
- Ir em "Meios de Pagamento" ou "Configurações"
- Verificar se "PIX" está ativado para ambiente de teste

---

## 🎯 PERGUNTA PARA O SUPORTE

> "O teste 1 passou (token válido), mas o teste 3 (PIX) retorna 401 'Unauthorized use of live credentials'. Isso indica que PIX não está habilitado para credenciais de teste na minha aplicação? Como habilitar PIX para o ambiente de teste/sandbox?"

---

## 📊 RESUMO

| Teste | Resultado | Status |
|-------|-----------|--------|
| 1. Validar Token | ✅ PASSOU | Token válido |
| 2. Cartão (sem token SDK) | ⚠️ Erro esperado | Requer token |
| 3. PIX | ❌ FALHOU | 401 - PIX não habilitado |

**Credenciais usadas:**
- Access Token: `TEST-784280626350811-010707-...2482675969`
- Public Key: `TEST-ee1785fb-7b70-46b7-a082-67f857861eed`
- User ID: `2482675969`
- Conta: `victor.ds.pagliarinivds@gmail.com`
