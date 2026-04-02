/**
 * Sistema de UX - Toasts, Loaders e Tratamento de Erros
 * Papudim Frontend
 */

const UX = {
  // Configurações
  config: {
    toastDuration: 3000,
    loaderMinTime: 500, // Tempo mínimo de exibição do loader
  },

  // Estado
  _loaderStartTime: null,
  _activeLoader: null,
  _toastContainer: null,

  /**
   * Inicializa o container de toasts
   */
  init() {
    if (!this._toastContainer) {
      this._toastContainer = document.createElement("div");
      this._toastContainer.id = "ux-toast-container";
      this._toastContainer.className = "ux-toast-container";
      document.body.appendChild(this._toastContainer);
    }
    this._injectStyles();
  },

  /**
   * Exibe um toast de sucesso
   */
  success(message, duration = this.config.toastDuration) {
    this._showToast(message, "success", duration);
  },

  /**
   * Exibe um toast de erro
   */
  error(message, duration = this.config.toastDuration + 1000) {
    this._showToast(message, "error", duration);
  },

  /**
   * Exibe um toast de aviso
   */
  warn(message, duration = this.config.toastDuration) {
    this._showToast(message, "warn", duration);
  },

  /**
   * Exibe um toast informativo
   */
  info(message, duration = this.config.toastDuration) {
    this._showToast(message, "info", duration);
  },

  /**
   * Exibe um toast de erro de rede com opção de retry
   */
  networkError(message = "Erro de conexão. Verifique sua internet.", onRetry = null) {
    const toast = this._createToast(message, "error");
    
    if (onRetry) {
      const retryBtn = document.createElement("button");
      retryBtn.className = "ux-toast-retry";
      retryBtn.textContent = "Tentar novamente";
      retryBtn.onclick = () => {
        toast.remove();
        onRetry();
      };
      toast.querySelector(".ux-toast-content").appendChild(retryBtn);
    }
    
    this._toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    
    // Não auto-remove se tiver retry
    if (!onRetry) {
      setTimeout(() => this._removeToast(toast), this.config.toastDuration + 2000);
    }
  },

  /**
   * Exibe o loader global
   */
  showLoader(message = "Processando...") {
    this._loaderStartTime = Date.now();
    
    if (this._activeLoader) {
      const msgEl = this._activeLoader.querySelector(".ux-loader-message");
      if (msgEl) msgEl.textContent = message;
      return;
    }

    const loader = document.createElement("div");
    loader.id = "ux-loader";
    loader.className = "ux-loader";
    loader.innerHTML = `
      <div class="ux-loader-backdrop"></div>
      <div class="ux-loader-content">
        <div class="ux-loader-spinner">
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
          </svg>
        </div>
        <p class="ux-loader-message">${this._escapeHTML(message)}</p>
      </div>
    `;
    
    document.body.appendChild(loader);
    this._activeLoader = loader;
    requestAnimationFrame(() => loader.classList.add("show"));
  },

  /**
   * Esconde o loader global (respeitando tempo mínimo)
   */
  async hideLoader() {
    if (!this._activeLoader) return;

    const elapsed = Date.now() - this._loaderStartTime;
    const remaining = Math.max(0, this.config.loaderMinTime - elapsed);
    
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }

    this._activeLoader.classList.remove("show");
    setTimeout(() => {
      this._activeLoader?.remove();
      this._activeLoader = null;
    }, 300);
  },

  /**
   * Atualiza mensagem do loader
   */
  updateLoader(message) {
    if (this._activeLoader) {
      const msgEl = this._activeLoader.querySelector(".ux-loader-message");
      if (msgEl) msgEl.textContent = message;
    }
  },

  /**
   * Wrapper para fetch com tratamento de erros e loading
   */
  async fetch(url, options = {}, config = {}) {
    const {
      showLoader = true,
      loaderMessage = "Carregando...",
      showErrorToast = true,
      retryCount = 0,
      retryDelay = 1000,
    } = config;

    let lastError;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (showLoader && attempt === 0) {
          this.showLoader(loaderMessage);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (showLoader) {
          await this.hideLoader();
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new UXError(
            errorData.erro || this._getHttpErrorMessage(response.status),
            response.status,
            errorData
          );
        }

        return response;
      } catch (error) {
        lastError = error;
        
        if (error.name === "AbortError") {
          lastError = new UXError("Tempo de conexão esgotado", 408);
        } else if (!navigator.onLine || error instanceof TypeError) {
          lastError = new UXError("Sem conexão com a internet", 0);
        }

        if (attempt < retryCount) {
          await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
          continue;
        }
      }
    }

    if (showLoader) {
      await this.hideLoader();
    }

    if (showErrorToast && lastError) {
      this.error(lastError.message);
    }

    throw lastError;
  },

  /**
   * Exibe dialog de confirmação
   */
  async confirm(message, options = {}) {
    const {
      title = "Confirmação",
      confirmText = "Confirmar",
      cancelText = "Cancelar",
      type = "default" // default, danger, warn
    } = options;

    return new Promise((resolve) => {
      const dialog = document.createElement("div");
      dialog.className = "ux-dialog";
      dialog.innerHTML = `
        <div class="ux-dialog-backdrop"></div>
        <div class="ux-dialog-content">
          <h3 class="ux-dialog-title">${this._escapeHTML(title)}</h3>
          <p class="ux-dialog-message">${this._escapeHTML(message)}</p>
          <div class="ux-dialog-actions">
            <button class="ux-dialog-btn cancel">${this._escapeHTML(cancelText)}</button>
            <button class="ux-dialog-btn confirm ${type}">${this._escapeHTML(confirmText)}</button>
          </div>
        </div>
      `;

      const cleanup = (result) => {
        dialog.classList.remove("show");
        setTimeout(() => dialog.remove(), 200);
        resolve(result);
      };

      dialog.querySelector(".cancel").onclick = () => cleanup(false);
      dialog.querySelector(".confirm").onclick = () => cleanup(true);
      dialog.querySelector(".ux-dialog-backdrop").onclick = () => cleanup(false);

      document.body.appendChild(dialog);
      requestAnimationFrame(() => dialog.classList.add("show"));
    });
  },

  // ===== MÉTODOS PRIVADOS =====

  _showToast(message, type, duration) {
    this.init();
    const toast = this._createToast(message, type);
    this._toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => this._removeToast(toast), duration);
  },

  _createToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `ux-toast ${type}`;
    
    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
      error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
      warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
      info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    };

    toast.innerHTML = `
      <div class="ux-toast-icon">${icons[type] || icons.info}</div>
      <div class="ux-toast-content">
        <span class="ux-toast-message">${this._escapeHTML(message)}</span>
      </div>
      <button class="ux-toast-close" aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;

    toast.querySelector(".ux-toast-close").onclick = () => this._removeToast(toast);
    return toast;
  },

  _removeToast(toast) {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 300);
  },

  _getHttpErrorMessage(status) {
    const messages = {
      400: "Dados inválidos. Verifique as informações.",
      401: "Sessão expirada. Faça login novamente.",
      403: "Acesso não autorizado.",
      404: "Recurso não encontrado.",
      408: "Tempo de conexão esgotado.",
      429: "Muitas requisições. Aguarde um momento.",
      500: "Erro interno do servidor.",
      502: "Servidor temporariamente indisponível.",
      503: "Serviço em manutenção.",
    };
    return messages[status] || "Erro ao processar requisição.";
  },

  _escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  _injectStyles() {
    if (document.getElementById("ux-styles")) return;
    
    const style = document.createElement("style");
    style.id = "ux-styles";
    style.textContent = `
      /* Toast Container */
      .ux-toast-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 400px;
        width: calc(100% - 2rem);
      }

      /* Toast */
      .ux-toast {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        transform: translateX(120%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .ux-toast.show {
        transform: translateX(0);
        opacity: 1;
      }

      .ux-toast.hide {
        transform: translateX(120%);
        opacity: 0;
      }

      .ux-toast-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
      }

      .ux-toast-icon svg {
        width: 100%;
        height: 100%;
      }

      .ux-toast.success .ux-toast-icon { color: #10b981; }
      .ux-toast.error .ux-toast-icon { color: #ef4444; }
      .ux-toast.warn .ux-toast-icon { color: #f59e0b; }
      .ux-toast.info .ux-toast-icon { color: #3b82f6; }

      .ux-toast.success { border-left: 4px solid #10b981; }
      .ux-toast.error { border-left: 4px solid #ef4444; }
      .ux-toast.warn { border-left: 4px solid #f59e0b; }
      .ux-toast.info { border-left: 4px solid #3b82f6; }

      .ux-toast-content {
        flex: 1;
        min-width: 0;
      }

      .ux-toast-message {
        display: block;
        color: #1f2937;
        font-size: 0.9rem;
        line-height: 1.4;
        word-break: break-word;
      }

      .ux-toast-close {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        padding: 0;
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        transition: color 0.2s;
      }

      .ux-toast-close:hover {
        color: #4b5563;
      }

      .ux-toast-retry {
        display: inline-block;
        margin-top: 0.5rem;
        padding: 0.35rem 0.75rem;
        background: #ef4444;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: background 0.2s;
      }

      .ux-toast-retry:hover {
        background: #dc2626;
      }

      /* Loader */
      .ux-loader {
        position: fixed;
        inset: 0;
        z-index: 99998;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .ux-loader.show {
        opacity: 1;
      }

      .ux-loader-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(4px);
      }

      .ux-loader-content {
        position: relative;
        text-align: center;
      }

      .ux-loader-spinner {
        width: 56px;
        height: 56px;
        margin: 0 auto 1rem;
      }

      .ux-loader-spinner svg {
        width: 100%;
        height: 100%;
        animation: ux-spin 1s linear infinite;
      }

      .ux-loader-spinner circle {
        stroke: #a47551;
        stroke-linecap: round;
        stroke-dasharray: 90, 150;
        stroke-dashoffset: 0;
        animation: ux-dash 1.5s ease-in-out infinite;
      }

      @keyframes ux-spin {
        100% { transform: rotate(360deg); }
      }

      @keyframes ux-dash {
        0% {
          stroke-dasharray: 1, 150;
          stroke-dashoffset: 0;
        }
        50% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -35;
        }
        100% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -124;
        }
      }

      .ux-loader-message {
        color: #a47551;
        font-weight: 600;
        font-size: 1rem;
      }

      /* Dialog */
      .ux-dialog {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .ux-dialog.show {
        opacity: 1;
      }

      .ux-dialog-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
      }

      .ux-dialog-content {
        position: relative;
        background: #fff;
        border-radius: 16px;
        padding: 1.5rem;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        transform: scale(0.95);
        transition: transform 0.2s;
      }

      .ux-dialog.show .ux-dialog-content {
        transform: scale(1);
      }

      .ux-dialog-title {
        margin: 0 0 0.5rem;
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
      }

      .ux-dialog-message {
        margin: 0 0 1.5rem;
        color: #4b5563;
        line-height: 1.5;
      }

      .ux-dialog-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }

      .ux-dialog-btn {
        padding: 0.6rem 1.25rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .ux-dialog-btn.cancel {
        background: #f3f4f6;
        color: #4b5563;
      }

      .ux-dialog-btn.cancel:hover {
        background: #e5e7eb;
      }

      .ux-dialog-btn.confirm {
        background: #a47551;
        color: #fff;
      }

      .ux-dialog-btn.confirm:hover {
        background: #916546;
      }

      .ux-dialog-btn.confirm.danger {
        background: #ef4444;
      }

      .ux-dialog-btn.confirm.danger:hover {
        background: #dc2626;
      }

      /* Mobile adjustments */
      @media (max-width: 640px) {
        .ux-toast-container {
          top: auto;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
        }

        .ux-toast {
          transform: translateY(120%);
        }

        .ux-toast.show {
          transform: translateY(0);
        }

        .ux-toast.hide {
          transform: translateY(120%);
        }
      }
    `;
    document.head.appendChild(style);
  },
};

/**
 * Classe de erro customizada para UX
 */
class UXError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "UXError";
    this.status = status;
    this.data = data;
  }
}

// Inicializar ao carregar
document.addEventListener("DOMContentLoaded", () => UX.init());

// Exportar para uso global
window.UX = UX;
window.UXError = UXError;
