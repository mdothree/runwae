/* ==========================================================================
   Runwae LLM Chat Module
   Slide-out drawer chat interface
   ========================================================================== */

const LLMChat = {
  config: {
    apiEndpoint: '/api/chat', // Configure your LLM API endpoint
    systemPrompt: 'You are Runwae Assistant, a helpful AI for the Runwae influencer marketing platform. Help users with finding influencers, creating campaigns, understanding analytics, and navigating the platform.',
    maxMessages: 50, // Keep last N messages in memory
    welcomeMessage: "Hi! I'm your Runwae assistant. How can I help you today?",
    suggestions: [
      "Find influencers for my campaign",
      "How do I track engagement?",
      "Explain my analytics"
    ]
  },

  messages: [],
  isOpen: false,
  isTyping: false,

  /**
   * Initialize the chat module
   */
  init: function() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

  /**
   * Setup the chat interface
   */
  setup: function() {
    this.injectHTML();
    this.bindEvents();
    this.loadMessages();
    this.showWelcome();
  },

  /**
   * Inject chat HTML into the page
   */
  injectHTML: function() {
    // Check if already injected
    if (document.querySelector('.llm-chat-drawer')) return;

    const html = `
      <!-- Chat Overlay -->
      <div class="llm-chat-overlay"></div>

      <!-- Chat Drawer -->
      <div class="llm-chat-drawer">
        <div class="llm-chat-header">
          <div class="llm-chat-header-title">
            <ion-icon name="chatbubbles"></ion-icon>
            <div>
              <h6>Runwae Assistant</h6>
              <div class="llm-chat-header-status">
                <span class="status-dot"></span>
                <span>Online</span>
              </div>
            </div>
          </div>
          <button class="llm-chat-close" aria-label="Close chat">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        <div class="llm-chat-messages">
          <!-- Messages will be inserted here -->
        </div>

        <div class="llm-chat-input">
          <div class="llm-chat-input-wrapper">
            <textarea
              placeholder="Type your message..."
              rows="1"
              aria-label="Chat message input"
            ></textarea>
          </div>
          <button class="llm-chat-send" aria-label="Send message">
            <ion-icon name="send"></ion-icon>
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    // Cache DOM elements
    this.elements = {
      overlay: document.querySelector('.llm-chat-overlay'),
      drawer: document.querySelector('.llm-chat-drawer'),
      messages: document.querySelector('.llm-chat-messages'),
      input: document.querySelector('.llm-chat-input textarea'),
      sendBtn: document.querySelector('.llm-chat-send'),
      closeBtn: document.querySelector('.llm-chat-close')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents: function() {
    // Toggle button (in header)
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('.llm-chat-toggle');
      if (toggle) {
        e.preventDefault();
        this.toggle();
      }
    });

    // Close button
    this.elements.closeBtn.addEventListener('click', () => this.close());

    // Overlay click to close
    this.elements.overlay.addEventListener('click', () => this.close());

    // Send button
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

    // Enter to send (Shift+Enter for new line)
    this.elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.elements.input.addEventListener('input', () => this.autoResizeInput());

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Quick suggestion clicks
    document.addEventListener('click', (e) => {
      const suggestion = e.target.closest('.llm-chat-suggestion');
      if (suggestion) {
        this.elements.input.value = suggestion.textContent;
        this.sendMessage();
      }
    });
  },

  /**
   * Toggle chat drawer open/close
   */
  toggle: function() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  /**
   * Open the chat drawer
   */
  open: function() {
    this.isOpen = true;
    this.elements.drawer.classList.add('active');
    this.elements.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus input
    setTimeout(() => {
      this.elements.input.focus();
    }, 300);

    // Update toggle icon
    this.updateToggleIcon(true);

    // Scroll to bottom
    this.scrollToBottom();
  },

  /**
   * Close the chat drawer
   */
  close: function() {
    this.isOpen = false;
    this.elements.drawer.classList.remove('active');
    this.elements.overlay.classList.remove('active');
    document.body.style.overflow = '';

    // Update toggle icon
    this.updateToggleIcon(false);
  },

  /**
   * Update toggle button icon
   * @param {boolean} isOpen - Whether chat is open
   */
  updateToggleIcon: function(isOpen) {
    const icons = document.querySelectorAll('.llm-chat-toggle ion-icon');
    icons.forEach(icon => {
      icon.setAttribute('name', isOpen ? 'close-outline' : 'chatbubbles-outline');
    });
  },

  /**
   * Show welcome message with suggestions
   */
  showWelcome: function() {
    if (this.messages.length === 0) {
      const suggestionsHTML = this.config.suggestions.map(s =>
        `<button class="llm-chat-suggestion">${this.escapeHtml(s)}</button>`
      ).join('');

      this.elements.messages.innerHTML = `
        <div class="llm-chat-welcome">
          <ion-icon name="sparkles-outline"></ion-icon>
          <h5>Welcome to Runwae Assistant</h5>
          <p>I can help you with campaigns, finding influencers, and understanding your analytics.</p>
          <div class="llm-chat-suggestions">
            ${suggestionsHTML}
          </div>
        </div>
      `;
    }
  },

  /**
   * Send a message
   */
  sendMessage: async function() {
    const text = this.elements.input.value.trim();
    if (!text || this.isTyping) return;

    // Clear input
    this.elements.input.value = '';
    this.autoResizeInput();

    // Remove welcome if present
    const welcome = this.elements.messages.querySelector('.llm-chat-welcome');
    if (welcome) welcome.remove();

    // Add user message
    this.addMessage('user', text);

    // Show typing indicator
    this.showTyping();

    try {
      const response = await this.callAPI(text);
      this.hideTyping();
      this.addMessage('assistant', response);
    } catch (error) {
      this.hideTyping();
      this.addMessage('error', 'Sorry, I encountered an error. Please try again.');
      console.error('LLM Chat Error:', error);
    }
  },

  /**
   * Call the LLM API
   * @param {string} message - User message
   * @returns {Promise<string>} Assistant response
   */
  callAPI: async function(message) {
    // Build messages array for API
    const apiMessages = this.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: this.config.systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.message || data.content || data.response;
    } catch (error) {
      // Fallback response for demo/development
      console.warn('API call failed, using fallback response:', error);
      return this.getFallbackResponse(message);
    }
  },

  /**
   * Get fallback response when API is unavailable
   * @param {string} message - User message
   * @returns {string} Fallback response
   */
  getFallbackResponse: function(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('influencer') || lowerMessage.includes('find')) {
      return "To find influencers, head to the Explore page where you can filter by category, follower count, and engagement rate. You can also use the search bar to find specific creators.";
    }

    if (lowerMessage.includes('campaign')) {
      return "Creating a campaign is easy! Go to your dashboard and click 'New Campaign'. You can set your budget, target audience, and invite influencers to participate.";
    }

    if (lowerMessage.includes('analytics') || lowerMessage.includes('stats')) {
      return "Your analytics dashboard shows engagement rates, reach, and ROI for your campaigns. Click on any campaign to see detailed performance metrics.";
    }

    if (lowerMessage.includes('help')) {
      return "I can help you with:\n• Finding influencers\n• Creating campaigns\n• Understanding analytics\n• Managing your profile\n\nWhat would you like to know more about?";
    }

    return "Thanks for your message! I'm here to help you get the most out of Runwae. Feel free to ask about finding influencers, managing campaigns, or understanding your analytics.";
  },

  /**
   * Add a message to the chat
   * @param {string} role - 'user', 'assistant', or 'error'
   * @param {string} content - Message content
   */
  addMessage: function(role, content) {
    // Store message
    if (role !== 'error') {
      this.messages.push({ role, content, timestamp: Date.now() });
      this.saveMessages();
    }

    // Trim old messages
    if (this.messages.length > this.config.maxMessages) {
      this.messages = this.messages.slice(-this.config.maxMessages);
    }

    // Create message HTML
    const messageClass = role === 'error' ? 'assistant error' : role;
    const avatar = role === 'assistant' || role === 'error' ? `
      <div class="llm-message-avatar">
        <ion-icon name="${role === 'error' ? 'alert-circle' : 'sparkles'}"></ion-icon>
      </div>
    ` : '';

    const html = `
      <div class="llm-message-wrapper ${role}">
        ${avatar}
        <div class="llm-message ${messageClass}">
          ${this.formatMessage(content)}
        </div>
      </div>
    `;

    this.elements.messages.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  },

  /**
   * Format message content (basic markdown-like formatting)
   * @param {string} content - Raw message content
   * @returns {string} Formatted HTML
   */
  formatMessage: function(content) {
    let formatted = this.escapeHtml(content);

    // Convert newlines to breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Bold text **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Bullet points
    formatted = formatted.replace(/^• (.+)$/gm, '<span class="bullet">• $1</span>');

    return formatted;
  },

  /**
   * Show typing indicator
   */
  showTyping: function() {
    this.isTyping = true;
    this.elements.sendBtn.disabled = true;

    const html = `
      <div class="llm-message-wrapper assistant">
        <div class="llm-message-avatar">
          <ion-icon name="sparkles"></ion-icon>
        </div>
        <div class="llm-message assistant llm-typing">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    this.elements.messages.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  },

  /**
   * Hide typing indicator
   */
  hideTyping: function() {
    this.isTyping = false;
    this.elements.sendBtn.disabled = false;

    const typing = this.elements.messages.querySelector('.llm-typing');
    if (typing) {
      typing.closest('.llm-message-wrapper').remove();
    }
  },

  /**
   * Scroll messages to bottom
   */
  scrollToBottom: function() {
    this.elements.messages.scrollTo({
      top: this.elements.messages.scrollHeight,
      behavior: 'smooth'
    });
  },

  /**
   * Auto-resize textarea based on content
   */
  autoResizeInput: function() {
    const textarea = this.elements.input;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Raw text
   * @returns {string} Escaped HTML
   */
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Save messages to localStorage
   */
  saveMessages: function() {
    try {
      localStorage.setItem('runwae-chat-messages', JSON.stringify(this.messages));
    } catch (e) {
      console.warn('Could not save chat messages:', e);
    }
  },

  /**
   * Load messages from localStorage
   */
  loadMessages: function() {
    try {
      const saved = localStorage.getItem('runwae-chat-messages');
      if (saved) {
        this.messages = JSON.parse(saved);

        // Render saved messages
        if (this.messages.length > 0) {
          this.messages.forEach(msg => {
            const avatar = msg.role === 'assistant' ? `
              <div class="llm-message-avatar">
                <ion-icon name="sparkles"></ion-icon>
              </div>
            ` : '';

            const html = `
              <div class="llm-message-wrapper ${msg.role}">
                ${avatar}
                <div class="llm-message ${msg.role}">
                  ${this.formatMessage(msg.content)}
                </div>
              </div>
            `;

            this.elements.messages.insertAdjacentHTML('beforeend', html);
          });
        }
      }
    } catch (e) {
      console.warn('Could not load chat messages:', e);
      this.messages = [];
    }
  },

  /**
   * Clear chat history
   */
  clearHistory: function() {
    this.messages = [];
    localStorage.removeItem('runwae-chat-messages');
    this.elements.messages.innerHTML = '';
    this.showWelcome();
  }
};

// Initialize
LLMChat.init();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMChat;
} else {
  window.LLMChat = LLMChat;
}
