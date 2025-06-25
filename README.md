# Papudim - Sistema de Pedidos Online

Este repositório contém o **Papudim**, um sistema completo para pedidos online de pudins artesanais, incluindo frontend, backend e um microsserviço de insights para administração.

---

## Visão Geral

O Papudim permite que clientes façam pedidos personalizados de pudins, acompanhem o status do pagamento e que o administrador gerencie os pedidos e visualize insights de vendas. O sistema é composto por três partes principais:

- **Frontend:** Interface web para clientes e admin.
- **Backend:** API Node.js/Express para processar pedidos, pagamentos e autenticação.
- **Microsserviço de Insights:** Serviço Python que gera relatórios e estatísticas para o painel administrativo.

---

## Tecnologias Utilizadas

- **Frontend:** HTML, CSS (Tailwind), JavaScript
- **Backend:** Node.js, Express, Firebase Firestore, JWT, dotenv, helmet, cors, node-fetch
- **Microsserviço de Insights:** Python (Flask), integração via HTTP
- **APIs Externas:**
  - **Klever API:** Transações com criptomoeda 
  - **Asaas API:** Emissão de cobranças e pagamentos (PIX, cartão)
  - **Firebase Firestore:** Armazenamento dos pedidos
  - **CallMeBot API:** Notificações via WhatsApp

---

## Funcionalidades

### **Frontend**

- Página inicial e cardápio interativo
- Carrinho de compras com validação de pedido mínimo
- Checkout com integração de pagamento (PIX/Cartão)
- Transação com um click por cripto
- Página de status do pedido e feedback de pagamento
- Painel administrativo protegido por login (JWT)
- Exportação de pedidos em CSV
- Visualização de insights de vendas

### **Backend**

- API RESTful para pedidos, pagamentos, status e administração
- Integração com Firestore para persistência dos pedidos
- Integração com Asaas para geração de cobranças
- Webhook para confirmação automática de pagamento
- Envio de notificações via WhatsApp (CallMeBot)
- Autenticação de admin via JWT
- Controle de tentativas de login para segurança

### **Microsserviço de Insights**

- API Python que lê os dados dos pedidos e gera:
  - Faturamento total
  - Top sabores vendidos
  - Faturamento por data
- Endpoint consumido pelo painel admin do frontend

---

## Medidas de Segurança

- **Sanitização e validação de dados** em todos os inputs do cliente
- **Autenticação JWT** para rotas administrativas
- **Controle de tentativas de login** para evitar força bruta
- **Uso de variáveis de ambiente** para dados sensíveis (tokens, chaves)
- **CORS restrito** apenas ao domínio do frontend
- **Helmet** para headers HTTP seguros
- **Nunca subir `.env` ou chaves privadas** para o repositório

---

## Endpoints Principais

- `POST /api/pagar` — Cria um novo pedido e inicia o pagamento
- `POST /api/pagamento-webhook` — Recebe notificações de pagamento da Asaas
- `GET /api/status-pedido?id=...` — Consulta o status do pedido
- `GET /api/admin-pedidos` — Lista todos os pedidos (admin/JWT)
- `POST /api/login` — Login do administrador
- `GET /api/insights` — (Microsserviço Python) Retorna estatísticas para o admin

---

Desenvolvido para o Papudim.
