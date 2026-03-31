# Patches: Redis + HttpOnly Cookie para Login Admin

## ✅ MUDANÇAS JÁ APLICADAS

Este documento documenta as alterações implementadas para:
1. **Redis** - Armazenamento de tentativas de login (substituindo in-memory)
2. **HttpOnly Cookie** - Autenticação segura (substituindo localStorage)

---

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `server/index.js` | +imports Redis/cookieParser, +conexão Redis, +cookieParser middleware, rota `/api/login` async com Redis, novo endpoint `/api/logout` |
| `server/middlewares/authMiddleware.js` | Aceita token via cookie OU header Authorization |
| `frontend/public/admin-login.html` | `credentials: 'include'`, remove localStorage |
| `frontend/public/admin.html` | Remove leitura de localStorage, usa `credentials: 'include'`, logout chama API |
| `server/.env` | +REDIS_URL, +JWT_COOKIE_NAME, +JWT_EXPIRES_SECONDS |

---

## Dependências Instaladas

```bash
npm install ioredis cookie-parser
```

---

## Variáveis de Ambiente Adicionadas (.env)

```env
REDIS_URL=redis://localhost:6379
JWT_COOKIE_NAME=adminToken
JWT_EXPIRES_SECONDS=43200
```

---

## 7. Checklist de Testes

- [ ] `npm install ioredis cookie-parser` no diretório server
- [ ] Adicionar variáveis no `.env`
- [ ] Reiniciar servidor
- [ ] Testar login com senha errada 5x → deve bloquear
- [ ] Esperar 10 min ou resetar Redis → deve desbloquear
- [ ] Testar login correto → cookie `adminToken` aparece em DevTools > Application > Cookies
- [ ] Verificar que `localStorage` NÃO tem mais `adminToken`
- [ ] Navegar para `/admin.html` → deve carregar pedidos se autenticado
- [ ] Clicar em "Sair" → deve chamar `/api/logout` e redirecionar
- [ ] Tentar acessar `/admin.html` sem cookie → deve redirecionar para login

---

## 8. Notas de Produção

1. **REDIS_URL** em produção deve apontar para um Redis hospedado (Upstash, Redis Cloud, etc.)
2. **secure: true** no cookie só funciona com HTTPS
3. O CORS já está configurado com `credentials: true` ✓
4. Para debug, verificar logs `[REDIS]` e `[AUTH]` no console do servidor
