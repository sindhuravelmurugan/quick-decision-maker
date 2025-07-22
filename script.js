class DecisionMaker {
    constructor() {
        this.currentDecision = null;
        this.decisionHistory = this.loadHistory();
        this.initializeEventListeners();
        this.updateHistoryDisplay();
        this.checkAPIConfiguration();
    }

    initializeEventListeners() {
        // Main analyze button
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyzeDecision();
        });

        // New decision button
        document.getElementById('newDecisionBtn').addEventListener('click', () => {
            this.resetForm();
        });

        // Save decision button
        document.getElementById('saveDecisionBtn').addEventListener('click', () => {
            this.saveCurrentDecision();
        });

        // Enter key support for decision input
        document.getElementById('decision').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeDecision();
            }
        });

        // Auto-resize textareas
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('input', this.autoResize);
        });
    }

    // Check if API is properly configured
    checkAPIConfiguration() {
        if (!window.CONFIG || !window.CONFIG.GROQ_API_KEY || 
            window.CONFIG.GROQ_API_KEY === 'gsk_your_actual_groq_api_key_here') {
            console.warn('⚠️ Groq API key not configured. Please update config.js with your real API key.');
        } else {
            console.log('✅ Groq API configuration detected');
        }
    }

    // Auto-resize textareas
    autoResize(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    getFormData() {
        const decision = document.getElementById('decision').value.trim();
        const prosText = document.getElementById('pros').value.trim();
        const consText = document.getElementById('cons').value.trim();

        const pros = prosText ? prosText.split('\n').filter(item => item.trim()) : [];
        const cons = consText ? consText.split('\n').filter(item => item.trim()) : [];

        return { decision, pros, cons };
    }

    validateForm(data) {
        if (!data.decision) {
            this.showError('Please enter a decision you need to make.');
            document.getElementById('decision').focus();
            return false;
        }

        if (data.pros.length === 0 && data.cons.length === 0) {
            this.showError('Please enter at least one pro or con to analyze.');
            document.getElementById('pros').focus();
            return false;
        }

        return true;
    }

    resetForm() {
        document.getElementById('decision').value = '';
        document.getElementById('pros').value = '';
        document.getElementById('cons').value = '';
        document.getElementById('resultsContainer').style.display = 'none';
        document.getElementById('decisionForm').style.display = 'block';
        
        // Reset textarea heights
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.style.height = 'auto';
        });

        // Reset enhanced UI elements
        this.resetEnhancedElements();
    }

    resetEnhancedElements() {
        // Reset recommendation badge
        const badge = document.getElementById('recommendationBadge');
        const icon = document.getElementById('recommendationIcon');
        const text = document.getElementById('recommendationTextNew');
        
        if (badge) {
            badge.classList.remove('proceed', 'reject', 'neutral');
        }
        if (icon) {
            icon.textContent = '🤔';
        }
        if (text) {
            text.textContent = 'Analyzing...';
        }

        // Reset confidence circle
        const confidenceNumber = document.getElementById('confidenceNumber');
        const progressRing = document.getElementById('progressRingFill');
        
        if (confidenceNumber) {
            confidenceNumber.textContent = '0%';
        }
        if (progressRing) {
            progressRing.style.strokeDasharray = '0 188.5';
        }
    }

    showError(message) {
        alert(message);
    }

    async analyzeDecision() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        this.setLoadingState(true);

        try {
            // Use real AI analysis
            const analysis = await this.analyzeDecisionWithAI(formData);
            
            this.currentDecision = {
                ...formData,
                analysis,
                timestamp: new Date().toISOString()
            };

            this.displayResults(analysis);
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.handleAnalysisError(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    // Real AI Analysis using Groq API
    async analyzeDecisionWithAI(data) {
        // Check if API key is configured
        if (!window.CONFIG || !window.CONFIG.GROQ_API_KEY || 
            window.CONFIG.GROQ_API_KEY === 'gsk_your_actual_groq_api_key_here') {
            throw new Error('API_KEY_NOT_CONFIGURED');
        }

        // Create the prompt for AI analysis
        const prompt = this.createAnalysisPrompt(data);

        try {
            const response = await fetch(window.CONFIG.GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.CONFIG.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: window.CONFIG.MODEL,
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert decision analyst who helps people make better choices. Provide clear, practical recommendations with confidence percentages and detailed reasoning. Be concise but thorough. Always include a confidence percentage between 0-100%."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: window.CONFIG.MAX_TOKENS,
                    temperature: window.CONFIG.TEMPERATURE
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API_ERROR: ${errorData.error?.message || `HTTP ${response.status}`}`);
            }

            const responseData = await response.json();
            const aiResponse = responseData.choices[0].message.content;

            // Parse the AI response into structured format
            return this.parseAIResponse(aiResponse);

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('NETWORK_ERROR');
            }
            throw error;
        }
    }

    // Create a detailed prompt for the AI
    createAnalysisPrompt(data) {
        let prompt = `Please analyze this decision: "${data.decision}"\n\n`;
        
        if (data.pros.length > 0) {
            prompt += `POSITIVE FACTORS:\n`;
            data.pros.forEach(pro => prompt += `• ${pro}\n`);
            prompt += `\n`;
        }
        
        if (data.cons.length > 0) {
            prompt += `CONCERNS/NEGATIVES:\n`;
            data.cons.forEach(con => prompt += `• ${con}\n`);
            prompt += `\n`;
        }

        prompt += `Please provide:
1. A clear recommendation (PROCEED, DO NOT PROCEED, or NEUTRAL)
2. Confidence percentage (0-100%)
3. Detailed reasoning for your recommendation
4. Key factors that influenced your analysis
5. Any additional considerations or suggestions

Please structure your response clearly with your recommendation and confidence level at the beginning.`;

        return prompt;
    }

    // Parse AI response into structured data
    parseAIResponse(aiResponse) {
        try {
            // Extract confidence percentage
            const confidenceMatches = aiResponse.match(/(\d+)%/g);
            let confidence = 50; // default
            
            if (confidenceMatches && confidenceMatches.length > 0) {
                // Take the first percentage found
                confidence = parseInt(confidenceMatches[0].replace('%', ''));
                // Ensure it's within valid range
                confidence = Math.max(0, Math.min(100, confidence));
            }

            // Extract recommendation
            let recommendation = "NEUTRAL";
            const upperResponse = aiResponse.toUpperCase();
            
            if (upperResponse.includes("DO NOT PROCEED") || upperResponse.includes("DON'T PROCEED")) {
                recommendation = "DO NOT PROCEED";
            } else if (upperResponse.includes("PROCEED")) {
                recommendation = "PROCEED";
            } else if (upperResponse.includes("NEUTRAL") || upperResponse.includes("UNDECIDED")) {
                recommendation = "NEUTRAL";
            }

            // Clean up the reasoning
            let reasoning = aiResponse.trim();
            
            // Remove any structured markers if they exist
            reasoning = reasoning.replace(/^(RECOMMENDATION|CONFIDENCE|ANALYSIS):\s*/gim, '');
            
            return {
                confidence,
                recommendation,
                reasoning
            };

        } catch (error) {
            console.error('Error parsing AI response:', error);
            // Fallback to original response
            return {
                confidence: 50,
                recommendation: "NEUTRAL",
                reasoning: aiResponse || "Unable to analyze the decision at this time. Please try again."
            };
        }
    }

    // Handle different types of analysis errors
    handleAnalysisError(error) {
        let errorMessage = 'Sorry, there was an error analyzing your decision.';
        let suggestion = 'Please try again in a moment.';
        
        if (error.message.includes('API_KEY_NOT_CONFIGURED')) {
            errorMessage = 'API Configuration Required';
            suggestion = 'Please add your Groq API key to config.js file. Visit console.groq.com to get your free API key.';
        } else if (error.message.includes('API_ERROR')) {
            errorMessage = 'API Service Error';
            suggestion = 'The AI service is temporarily unavailable. Please try again in a few moments.';
        } else if (error.message.includes('NETWORK_ERROR')) {
            errorMessage = 'Network Connection Error';
            suggestion = 'Please check your internet connection and try again.';
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'Rate Limit Exceeded';
            suggestion = 'Please wait a moment before making another request.';
        }
        
        alert(`${errorMessage}\n\n${suggestion}`);
    }

    setLoadingState(isLoading) {
        const btn = document.getElementById('analyzeBtn');
        const btnText = document.getElementById('btnText');
        const spinner = document.getElementById('loadingSpinner');

        if (isLoading) {
            btn.disabled = true;
            btnText.style.display = 'none';
            spinner.style.display = 'inline';
            spinner.textContent = '🤔'; // Thinking emoji
            
            // Update enhanced elements for loading state
            this.setEnhancedLoadingState(true);
        } else {
            btn.disabled = false;
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
            
            this.setEnhancedLoadingState(false);
        }
    }

    setEnhancedLoadingState(isLoading) {
        const badge = document.getElementById('recommendationBadge');
        const icon = document.getElementById('recommendationIcon');
        const text = document.getElementById('recommendationTextNew');
        
        if (isLoading) {
            if (badge) {
                badge.classList.remove('proceed', 'reject', 'neutral');
            }
            if (icon) {
                icon.textContent = '🤔';
            }
            if (text) {
                text.textContent = 'Analyzing...';
            }
        }
    }

    displayResults(analysis) {
        // Update OLD elements (for compatibility)
        const confidenceElement = document.getElementById('confidenceScore');
        confidenceElement.textContent = `${analysis.confidence}%`;
        
        // Color code based on confidence level
        if (analysis.confidence >= 75) {
            confidenceElement.style.background = '#28a745'; // Green
        } else if (analysis.confidence >= 50) {
            confidenceElement.style.background = '#ffc107'; // Yellow
        } else {
            confidenceElement.style.background = '#dc3545'; // Red
        }
        
        // Update NEW enhanced elements
        this.updateEnhancedRecommendation(analysis);
        
        // Update recommendation text (old way)
        const recommendationText = this.formatRecommendation(analysis);
        document.getElementById('recommendationText').innerHTML = recommendationText;
        
        // Update reasoning with enhanced formatting
        const reasoningElement = document.getElementById('reasoningText');
        reasoningElement.innerHTML = this.formatReasoning(analysis.reasoning);

        // Add fade-in animation to reasoning sections
        setTimeout(() => {
            const reasoningSections = reasoningElement.querySelectorAll('[style*="animation-delay"]');
            reasoningSections.forEach(section => {
                section.style.opacity = '1';
            });
        }, 100);
        
        // Show results, hide form
        document.getElementById('resultsContainer').style.display = 'block';
        document.getElementById('decisionForm').style.display = 'none';
        
        // Scroll to results with animation
        setTimeout(() => {
            document.getElementById('resultsContainer').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }

    formatReasoning(reasoning) {
        // Try to parse structured reasoning first
        const structuredReasoning = this.parseStructuredReasoning(reasoning);
        
        if (structuredReasoning) {
            return this.renderStructuredReasoning(structuredReasoning);
        } else {
            // Fallback to enhanced basic formatting
            return this.renderBasicReasoning(reasoning);
        }
    }

    // NEW: Parse AI response into structured sections
    parseStructuredReasoning(reasoning) {
        try {
            const sections = {};
            
            // Extract main summary (first paragraph)
            const paragraphs = reasoning.split('\n\n');
            if (paragraphs.length > 0) {
                sections.summary = paragraphs[0].replace(/^\*\*.*?\*\*\s*/, '').trim();
            }
            
            // Extract key factors
            const factorsMatch = reasoning.match(/\*\*KEY FACTORS.*?\*\*(.*?)(?=\*\*|$)/s);
            if (factorsMatch) {
                const factorsText = factorsMatch[1];
                sections.keyFactors = this.extractListItems(factorsText);
            }
            
            // Extract suggestions
            const suggestionsMatch = reasoning.match(/\*\*ADDITIONAL CONSIDERATIONS.*?\*\*(.*?)(?=\*\*|$)/s);
            if (suggestionsMatch) {
                const suggestionsText = suggestionsMatch[1];
                sections.suggestions = this.extractListItems(suggestionsText);
            }
            
            // Extract main reasoning paragraphs (exclude structured sections)
            let mainReasoning = reasoning
                .replace(/\*\*RECOMMENDATION.*?\*\*/g, '')
                .replace(/\*\*CONFIDENCE.*?\*\*/g, '')
                .replace(/\*\*DETAILED REASONING.*?\*\*/g, '')
                .replace(/\*\*KEY FACTORS.*?\*\*[\s\S]*?(?=\*\*|$)/g, '')
                .replace(/\*\*ADDITIONAL CONSIDERATIONS.*?\*\*[\s\S]*?(?=\*\*|$)/g, '')
                .trim();
            
            // Split into paragraphs and clean up
            sections.mainPoints = mainReasoning
                .split('\n\n')
                .filter(p => p.trim() && p.length > 20)
                .map(p => p.trim());
            
            return sections.summary || sections.keyFactors || sections.suggestions || sections.mainPoints.length > 0 ? sections : null;
            
        } catch (error) {
            console.error('Error parsing structured reasoning:', error);
            return null;
        }
    }

    // Extract numbered or bulleted list items
    extractListItems(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const items = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            // Match numbered lists (1. 2. 3.) or bullet points (• - *)
            const match = trimmed.match(/^(?:\d+\.\s*|[•\-*]\s*)(.+)/);
            if (match) {
                items.push(match[1].trim());
            } else if (trimmed.length > 10) {
                // Include longer non-bulleted lines
                items.push(trimmed);
            }
        }
        
        return items.length > 0 ? items : null;
    }

    // Render structured reasoning with enhanced UI
    renderStructuredReasoning(sections) {
        let html = '';
        
        // Quick Summary
        if (sections.summary) {
            html += `
            <div class="reasoning-summary-section">
                <h4><span class="section-icon">📝</span>Quick Summary</h4>
                <p class="summary-text">${this.escapeHtml(sections.summary)}</p>
            </div>`;
        }
        
        // Main reasoning points
        if (sections.mainPoints && sections.mainPoints.length > 0) {
            html += `
            <div class="reasoning-main-section">
                <h4><span class="section-icon">🧠</span>Analysis</h4>
                <div class="reasoning-points">`;
            
            sections.mainPoints.forEach((point, index) => {
                html += `
                    <div class="reasoning-point" style="animation-delay: ${index * 0.1}s">
                        <div class="point-indicator">${index + 1}</div>
                        <div class="point-content">${this.escapeHtml(point)}</div>
                    </div>`;
            });
            
            html += `</div></div>`;
        }
        
        // Key factors
        if (sections.keyFactors && sections.keyFactors.length > 0) {
            html += `
            <div class="reasoning-factors-section">
                <h4><span class="section-icon">🎯</span>Key Factors</h4>
                <div class="factors-grid">`;
            
            sections.keyFactors.forEach((factor, index) => {
                html += `
                    <div class="factor-item" style="animation-delay: ${index * 0.1}s">
                        <span class="factor-bullet">▶</span>
                        <span class="factor-text">${this.escapeHtml(factor)}</span>
                    </div>`;
            });
            
            html += `</div></div>`;
        }
        
        // Suggestions
        if (sections.suggestions && sections.suggestions.length > 0) {
            html += `
            <div class="reasoning-suggestions-section">
                <h4><span class="section-icon">💡</span>Action Items</h4>
                <div class="suggestions-list">`;
            
            sections.suggestions.forEach((suggestion, index) => {
                html += `
                    <div class="suggestion-item" style="animation-delay: ${index * 0.1}s">
                        <span class="suggestion-icon">✓</span>
                        <span class="suggestion-text">${this.escapeHtml(suggestion)}</span>
                    </div>`;
            });
            
            html += `</div></div>`;
        }
        
        return html || this.renderBasicReasoning(sections.summary || 'Analysis complete.');
    }

    // Enhanced basic reasoning for non-structured responses
    renderBasicReasoning(reasoning) {
        const paragraphs = reasoning.split('\n\n').filter(p => p.trim());
        
        let html = `
        <div class="reasoning-basic-section">
            <h4><span class="section-icon">🧠</span>AI Analysis</h4>
            <div class="basic-reasoning-content">`;
        
        paragraphs.forEach((paragraph, index) => {
            const cleanParagraph = paragraph
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            
            html += `
                <div class="reasoning-paragraph" style="animation-delay: ${index * 0.2}s">
                    ${cleanParagraph}
                </div>`;
        });
        
        html += `</div></div>`;
        return html;
    }

    updateEnhancedRecommendation(analysis) {
        // Update confidence circle with animation
        this.animateConfidenceCircle(analysis.confidence);
        
        // Update recommendation badge
        this.updateRecommendationBadge(analysis);
    }

    animateConfidenceCircle(confidence) {
        const confidenceNumber = document.getElementById('confidenceNumber');
        const progressRing = document.getElementById('progressRingFill');
        
        if (confidenceNumber) {
            // Animate number counting up
            this.animateNumber(confidenceNumber, 0, confidence, 1000);
        }
        
        if (progressRing) {
            // Calculate stroke-dasharray for circle progress
            const circumference = 2 * Math.PI * 30; // radius = 30
            const progress = (confidence / 100) * circumference;
            
            // Set initial state
            progressRing.style.strokeDasharray = `0 ${circumference}`;
            
            // Animate progress ring
            setTimeout(() => {
                progressRing.style.strokeDasharray = `${progress} ${circumference}`;
                progressRing.style.transition = 'stroke-dasharray 1s ease-in-out';
                
                // Color based on confidence
                if (confidence >= 75) {
                    progressRing.style.stroke = '#28a745';
                    if (confidenceNumber) {
                        confidenceNumber.style.borderColor = '#28a745';
                        confidenceNumber.style.color = '#28a745';
                    }
                } else if (confidence >= 50) {
                    progressRing.style.stroke = '#ffc107';
                    if (confidenceNumber) {
                        confidenceNumber.style.borderColor = '#ffc107';
                        confidenceNumber.style.color = '#ffc107';
                    }
                } else {
                    progressRing.style.stroke = '#dc3545';
                    if (confidenceNumber) {
                        confidenceNumber.style.borderColor = '#dc3545';
                        confidenceNumber.style.color = '#dc3545';
                    }
                }
            }, 200);
        }
    }

    animateNumber(element, start, end, duration) {
        const range = end - start;
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.round(start + (range * progress));
            element.textContent = `${current}%`;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };
        
        requestAnimationFrame(updateNumber);
    }

    updateRecommendationBadge(analysis) {
        const badge = document.getElementById('recommendationBadge');
        const icon = document.getElementById('recommendationIcon');
        const text = document.getElementById('recommendationTextNew');
        
        if (badge && icon && text) {
            // Remove old classes
            badge.classList.remove('proceed', 'reject', 'neutral');
            
            // Set icon and text based on recommendation
            if (analysis.recommendation === 'PROCEED') {
                badge.classList.add('proceed');
                icon.textContent = '✅';
                text.textContent = 'PROCEED';
            } else if (analysis.recommendation === 'DO NOT PROCEED') {
                badge.classList.add('reject');
                icon.textContent = '❌';
                text.textContent = 'DO NOT PROCEED';
            } else {
                badge.classList.add('neutral');
                icon.textContent = '🤔';
                text.textContent = 'NEUTRAL';
            }
        }
    }

    formatRecommendation(analysis) {
        const icons = {
            'PROCEED': '✅',
            'DO NOT PROCEED': '❌',
            'NEUTRAL': '🤔'
        };
        
        const icon = icons[analysis.recommendation] || '🤔';
        const confidence = analysis.confidence;
        
        return `<strong>${icon} ${confidence}% Confidence: ${analysis.recommendation}</strong>`;
    }

    saveCurrentDecision() {
        if (!this.currentDecision) {
            alert('No decision to save.');
            return;
        }

        // Check if this decision already exists in history
        const existingIndex = this.decisionHistory.findIndex(
            d => d.decision === this.currentDecision.decision && 
                 d.timestamp === this.currentDecision.timestamp
        );

        if (existingIndex === -1) {
            this.decisionHistory.unshift(this.currentDecision);
            
            // Keep only last 20 decisions
            if (this.decisionHistory.length > 20) {
                this.decisionHistory = this.decisionHistory.slice(0, 20);
            }

            this.saveHistory();
            this.updateHistoryDisplay();
            
            alert('✅ Decision saved to history!');
        } else {
            alert('This decision is already saved in your history.');
        }
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('quickDecisionMakerHistory');
            const history = saved ? JSON.parse(saved) : [];
            
            // Validate the loaded data
            return history.filter(decision => 
                decision && 
                decision.decision && 
                decision.analysis && 
                decision.timestamp
            );
        } catch (error) {
            console.error('Error loading decision history:', error);
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('quickDecisionMakerHistory', JSON.stringify(this.decisionHistory));
        } catch (error) {
            console.error('Error saving decision history:', error);
            alert('Unable to save decision history. Your browser storage might be full.');
        }
    }

    updateHistoryDisplay() {
        const historyContainer = document.getElementById('historyContainer');
        const historyList = document.getElementById('historyList');

        if (!historyContainer || !historyList) {
            return; // Elements don't exist yet
        }

        if (this.decisionHistory.length === 0) {
            historyContainer.style.display = 'none';
            return;
        }

        historyContainer.style.display = 'block';
        historyList.innerHTML = '';

        this.decisionHistory.forEach((decision, index) => {
            const item = this.createHistoryItem(decision, index);
            historyList.appendChild(item);
        });
    }

    createHistoryItem(decision, index) {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const date = new Date(decision.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const preview = `${decision.analysis.confidence}% confidence - ${decision.analysis.recommendation}`;
        
        item.innerHTML = `
            <div class="history-item-title">${this.escapeHtml(decision.decision)}</div>
            <div class="history-item-date">${date}</div>
            <div class="history-item-preview">${this.escapeHtml(preview)}</div>
        `;

        item.addEventListener('click', () => {
            this.loadDecisionFromHistory(decision);
        });

        return item;
    }

    loadDecisionFromHistory(decision) {
        // Load the decision back into the form
        document.getElementById('decision').value = decision.decision;
        document.getElementById('pros').value = decision.pros.join('\n');
        document.getElementById('cons').value = decision.cons.join('\n');
        
        // Show the previous results
        this.currentDecision = decision;
        this.displayResults(decision.analysis);
    }

    // ==============================================
    // UTILITY FUNCTIONS
    // ==============================================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==============================================
// INITIALIZE APP WHEN DOM IS READY
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if required elements exist
    const requiredElements = ['analyzeBtn', 'decision', 'pros', 'cons', 'resultsContainer'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements);
        return;
    }

    // Initialize the Decision Maker app
    window.decisionMaker = new DecisionMaker();
    
    console.log('🚀 Quick Decision Maker initialized successfully!');
});

// ==============================================
// GLOBAL ERROR HANDLING
// ==============================================
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});