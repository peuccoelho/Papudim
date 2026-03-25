# Papudim - Sistema de Pedidos Online

Sistema completo para pedidos online de pudins artesanais, incluindo frontend, backend e microsserviço de insights para administração.

---

## Visão Geral

O sistema permite que clientes façam pedidos personalizados de pudins, acompanhem o status do pagamento e que o administrador gerencie os pedidos e visualize insights de vendas. O sistema é composto por três partes principais:

- **Frontend:** Interface web para clientes e admin (HTML, Tailwind CSS, JS)
- **Backend:** API Node.js/Express para processar pedidos, pagamentos e autenticação
- **Microsserviço de Insights:** Serviço Python (Flask) que gera relatórios e estatísticas para o painel admin

---

## Funcionalidades

### Frontend
- Página inicial e cardápio interativo
- Carrinho de compras com validação de pedido mínimo
- Checkout com integração de pagamento (PIX/Cartão)
- Página de status do pedido e feedback de pagamento
- Painel administrativo protegido por login (JWT)
- Exportação de pedidos em CSV
- Visualização de insights de vendas
- Redirecionamento para WhatsApp após pedido (compatível com Safari)

### Backend
- API RESTful para pedidos, pagamentos, status e administração
- Integração com Firestore para persistência dos pedidos
- Integração com Asaas para geração de cobranças (pode estar desativado, veja REATIVAR_ASAAS.md)
- Webhook para confirmação automática de pagamento
- Envio de notificações via WhatsApp (CallMeBot)
- Autenticação de admin via JWT
- Controle de tentativas de login para segurança
- Sanitização e validação de dados em todos os inputs
- Uso de variáveis de ambiente para dados sensíveis
- CORS restrito apenas ao domínio do frontend
- Helmet para headers HTTP seguros

### Microsserviço de Insights
- API Python que lê os dados dos pedidos e gera:
  - Faturamento total
  - Top sabores vendidos
  - Faturamento por data
- Endpoint consumido pelo painel admin do frontend

---

## Tecnologias Utilizadas
- **Node.js**, **Express**, **Firebase Firestore**
- **Asaas API** (emissão de cobranças e pagamentos)
- **CallMeBot API** (notificações WhatsApp)
- **JWT** (autenticação de administrador)
- **dotenv**, **helmet**, **CORS**, **node-fetch**
- **Frontend:** HTML, Tailwind CSS, JavaScript
- **Microsserviço:** Python (Flask)

---

## Endpoints Principais
- `POST /api/pagar`  
  Cria um novo pedido e inicia o processo de cobrança.
- `POST /api/pagamento-webhook`  
  Recebe notificações de pagamento da Asaas.
- `GET /api/status-pedido?id=...`  
  Consulta o status do pedido.
- `GET /api/admin-pedidos`  
  Lista todos os pedidos (requer autenticação JWT).
- `POST /api/login`  
  Login do administrador.

---

## Observações
- O frontend está na pasta `frontend/public` e se comunica via fetch com este backend.
- O projeto está pronto para deploy em serviços como Render, Heroku, Vercel, etc.
- Nunca suba o arquivo `.env` ou as chaves do Firebase para repositórios públicos.
- O campo "endereço" do cliente é obrigatório e aparece no painel admin.
- O redirecionamento para WhatsApp após o pedido é compatível com Safari e outros navegadores.
- Para reativar a integração com Asaas, veja o arquivo REATIVAR_ASAAS.md.

---

Desenvolvido para o Papudim.
