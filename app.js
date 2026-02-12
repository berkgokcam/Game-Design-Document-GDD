/**
 * GDD Studio - Game Design Document Generator
 * AI-powered GDD creation tool using local Ollama models
 */

// ===== Configuration =====
const CONFIG = {
    ollamaUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    maxTokens: 4096,
    temperature: 0.7
};

// ===== GDD Template Structure =====
const GDD_SECTIONS = [
    {
        id: 'overview',
        title: 'Game Overview',
        icon: 'fa-gamepad',
        description: 'General concept and vision of the game',
        prompt: 'Game overview, concept, genre, target audience, and unique selling points'
    },
    {
        id: 'gameplay',
        title: 'Gameplay Mechanics',
        icon: 'fa-cogs',
        description: 'Core game mechanics and systems',
        prompt: 'Core gameplay loop, controls, mechanics, and game systems'
    },
    {
        id: 'story',
        title: 'Story & Narrative',
        icon: 'fa-book',
        description: 'Game story and narrative structure',
        prompt: 'Main story, narrative summary, story structure, and themes'
    },
    {
        id: 'characters',
        title: 'Characters',
        icon: 'fa-users',
        description: 'Main and supporting characters',
        prompt: 'Main character, supporting characters, enemies, and NPCs'
    },
    {
        id: 'world',
        title: 'World & Level Design',
        icon: 'fa-globe',
        description: 'Game world and level structure',
        prompt: 'Game world, locations, level design, and environment'
    },
    {
        id: 'art',
        title: 'Art Style',
        icon: 'fa-palette',
        description: 'Art direction and visual design',
        prompt: 'Art style, color palette, UI/UX design, and visual references'
    },
    {
        id: 'audio',
        title: 'Sound Design',
        icon: 'fa-volume-up',
        description: 'Music and sound effects',
        prompt: 'Music style, sound effects, voice acting, and ambient sounds'
    },
    {
        id: 'technical',
        title: 'Technical Requirements',
        icon: 'fa-server',
        description: 'Technical specs and requirements',
        prompt: 'Game engine, platform requirements, minimum/recommended system specs'
    },
    {
        id: 'monetization',
        title: 'Monetization',
        icon: 'fa-coins',
        description: 'Revenue model and pricing',
        prompt: 'Revenue model, pricing, DLC plans, and in-app purchases'
    },
    {
        id: 'timeline',
        title: 'Timeline',
        icon: 'fa-calendar-alt',
        description: 'Development plan and milestones',
        prompt: 'Development phases, milestones, and release date plan'
    }
];

// ===== State Management =====
let state = {
    currentView: 'welcome',
    currentProject: null,
    ollamaConnected: false,
    availableModels: [],
    selectedModel: CONFIG.defaultModel,
    chatHistory: [],
    gddData: {},
    isDarkTheme: true,
    generatingSection: null // track which section is being generated
};

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    mermaid.initialize({
        startOnLoad: true,
        theme: 'dark',
        themeVariables: {
            primaryColor: '#4fc3f7',
            primaryTextColor: '#cccccc',
            primaryBorderColor: '#3c3c3c',
            lineColor: '#6e6e6e',
            secondaryColor: '#2d2d30',
            tertiaryColor: '#252526'
        }
    });

    loadState();
    renderDocumentSections();
    setupEventListeners();
    await checkOllamaConnection();
    applyTheme();
}

// ===== Ollama API Functions =====
async function checkOllamaConnection() {
    const statusEl = document.getElementById('ollamaStatus');
    const statusDot = statusEl.querySelector('.status-dot');
    const statusText = statusEl.querySelector('span:last-child');

    try {
        const response = await fetch(`${CONFIG.ollamaUrl}/api/tags`);
        if (response.ok) {
            const data = await response.json();
            state.ollamaConnected = true;
            state.availableModels = data.models || [];

            statusDot.classList.add('connected');
            statusDot.classList.remove('error');
            statusText.textContent = 'Ollama Connected';

            populateModelSelect();
            showToast('Ollama connection successful!', 'success');
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        state.ollamaConnected = false;
        statusDot.classList.add('error');
        statusDot.classList.remove('connected');
        statusText.textContent = 'Ollama Disconnected';
        showToast('Could not connect to Ollama. Make sure the service is running.', 'error');
    }
}

function populateModelSelect() {
    const select = document.getElementById('modelSelect');
    select.innerHTML = '<option value="">Select Model...</option>';

    state.availableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        if (model.name === state.selectedModel) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

async function generateWithOllama(prompt, systemPrompt = '') {
    if (!state.ollamaConnected) {
        showToast('Ollama is not connected!', 'error');
        return null;
    }

    const model = state.selectedModel || CONFIG.defaultModel;

    const fullSystemPrompt = `You are a professional game designer and an expert in preparing Game Design Documents (GDD).
Respond in English. Create detailed, structured, and professional documents.
Write in Markdown format. Use headings, lists, and emphasis.
${systemPrompt}`;

    try {
        const response = await fetch(`${CONFIG.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                system: fullSystemPrompt,
                stream: false,
                options: {
                    temperature: CONFIG.temperature,
                    num_predict: CONFIG.maxTokens
                }
            })
        });

        if (!response.ok) throw new Error('Generation failed');
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Ollama error:', error);
        showToast('Error while generating AI response', 'error');
        return null;
    }
}

async function streamGenerateWithOllama(prompt, systemPrompt = '', onChunk) {
    if (!state.ollamaConnected) {
        showToast('Ollama is not connected!', 'error');
        return null;
    }

    const model = state.selectedModel || CONFIG.defaultModel;

    const fullSystemPrompt = `You are a professional game designer and an expert in preparing Game Design Documents (GDD).
Respond in English. Create detailed, structured, and professional documents.
Write in Markdown format. Use headings, lists, and emphasis.
${systemPrompt}`;

    try {
        const response = await fetch(`${CONFIG.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                system: fullSystemPrompt,
                stream: true,
                options: {
                    temperature: CONFIG.temperature,
                    num_predict: CONFIG.maxTokens
                }
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.response) {
                        fullResponse += json.response;
                        if (onChunk) onChunk(json.response, fullResponse);
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }

        return fullResponse;
    } catch (error) {
        console.error('Ollama streaming error:', error);
        showToast('Error while generating AI response', 'error');
        return null;
    }
}

// ===== UI Functions =====
function renderDocumentSections() {
    const container = document.getElementById('documentSections');
    container.innerHTML = '';

    GDD_SECTIONS.forEach(section => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.dataset.section = section.id;

        const hasContent = state.gddData[section.id] && state.gddData[section.id].content;

        li.innerHTML = `
            <i class="fas ${section.icon}"></i>
            <span>${section.title}</span>
            <span class="progress-indicator ${hasContent ? 'completed' : ''}"></span>
        `;

        li.addEventListener('click', () => showSection(section.id));
        container.appendChild(li);
    });
}

function setupEventListeners() {
    document.getElementById('modelSelect').addEventListener('change', (e) => {
        state.selectedModel = e.target.value;
        saveState();
    });

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    document.getElementById('newProjectBtn').addEventListener('click', () => {
        document.getElementById('newProjectModal').classList.remove('hidden');
    });

    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    });

    document.querySelectorAll('.nav-item[data-tool]').forEach(item => {
        item.addEventListener('click', () => {
            const tool = item.dataset.tool;
            navigateTo(tool);
        });
    });
}

function navigateTo(view) {
    state.currentView = view;

    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));

    switch (view) {
        case 'welcome':
            document.getElementById('welcomePanel').classList.remove('hidden');
            break;
        case 'chat':
            document.getElementById('chatPanel').classList.remove('hidden');
            break;
        case 'diagrams':
            document.getElementById('diagramPanel').classList.remove('hidden');
            updateDiagram();
            break;
        case 'export':
            document.getElementById('exportPanel').classList.remove('hidden');
            break;
        case 'gdd':
            document.getElementById('gddPanel').classList.remove('hidden');
            renderGDDContent();
            break;
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tool === view) {
            item.classList.add('active');
        }
    });

    updateBreadcrumb(view);
}

function updateBreadcrumb(view) {
    const breadcrumb = document.getElementById('breadcrumb');
    const titles = {
        welcome: 'Home',
        chat: 'AI Chat',
        diagrams: 'Diagrams',
        export: 'Export',
        gdd: state.currentProject?.name || 'GDD Editor'
    };
    breadcrumb.innerHTML = `<span>${titles[view] || view}</span>`;
}

function showSection(sectionId) {
    const section = GDD_SECTIONS.find(s => s.id === sectionId);
    if (!section) return;

    if (!state.currentProject) {
        showToast('Create a project first', 'info');
        return;
    }

    navigateTo('gdd');

    setTimeout(() => {
        const element = document.getElementById(`section-${sectionId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// ===== Project Functions =====
function startNewProject() {
    document.getElementById('newProjectModal').classList.remove('hidden');
}

function createProject() {
    const name = document.getElementById('newProjectName').value.trim();
    const genre = document.getElementById('newProjectGenre').value;
    const desc = document.getElementById('newProjectDesc').value.trim();
    const platforms = Array.from(document.querySelectorAll('.checkbox-group input:checked'))
        .map(cb => cb.value);

    if (!name) {
        showToast('Project name is required', 'error');
        return;
    }

    state.currentProject = {
        id: Date.now(),
        name: name,
        genre: genre,
        description: desc,
        platforms: platforms,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    state.gddData = {
        overview: {
            content: `# ${name}\n\n**Genre:** ${genre}\n**Platforms:** ${platforms.join(', ')}\n\n${desc}`
        }
    };

    closeModal('newProjectModal');
    saveState();
    renderDocumentSections();
    navigateTo('gdd');

    showToast('Project created!', 'success');

    document.getElementById('newProjectName').value = '';
    document.getElementById('newProjectDesc').value = '';
}

function renderGDDContent() {
    const container = document.getElementById('gddSections');
    container.innerHTML = '';

    if (!state.currentProject) {
        container.innerHTML = `
            <div class="section-placeholder" onclick="startNewProject()">
                <i class="fas fa-plus-circle"></i>
                <p>Click to create a new project</p>
            </div>
        `;
        return;
    }

    document.getElementById('gddTitle').value = state.currentProject.name;
    document.getElementById('lastUpdated').textContent = formatDate(state.currentProject.updatedAt);
    updateWordCount();

    GDD_SECTIONS.forEach(section => {
        const sectionData = state.gddData[section.id] || {};
        const hasContent = sectionData.content && sectionData.content.trim();
        const isGenerating = state.generatingSection === section.id;

        const div = document.createElement('div');
        div.className = 'gdd-section';
        div.id = `section-${section.id}`;

        div.innerHTML = `
            <div class="gdd-section-header" onclick="toggleSection('${section.id}')">
                <div class="gdd-section-title">
                    <i class="fas ${section.icon}"></i>
                    <h3>${section.title}</h3>
                </div>
                <div class="gdd-section-actions">
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); generateSection('${section.id}')" title="Generate with AI" ${isGenerating ? 'disabled' : ''}>
                        <i class="fas ${isGenerating ? 'fa-spinner fa-spin' : 'fa-magic'}"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); editSection('${section.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            <div class="gdd-section-content" id="content-${section.id}">
                ${hasContent ? parseMarkdown(sectionData.content) : `
                    <div class="section-placeholder" onclick="generateSection('${section.id}')">
                        <i class="fas fa-robot"></i>
                        <p>Generate content with AI</p>
                    </div>
                `}
            </div>
        `;

        container.appendChild(div);
    });
}

async function generateSection(sectionId) {
    const section = GDD_SECTIONS.find(s => s.id === sectionId);
    if (!section || !state.currentProject) return;

    // Mark section as generating (inline indicator, no overlay)
    state.generatingSection = sectionId;

    const contentEl = document.getElementById(`content-${sectionId}`);
    if (!contentEl) return;

    // Show inline loading indicator inside the section
    contentEl.innerHTML = `
        <div class="inline-loading">
            <div class="inline-spinner"></div>
            <span>AI is writing the <strong>${section.title}</strong> section...</span>
        </div>
    `;

    // Update the button to show spinner
    const sectionEl = document.getElementById(`section-${sectionId}`);
    const magicBtn = sectionEl?.querySelector('.fa-magic, .fa-spinner');
    if (magicBtn) {
        magicBtn.className = 'fas fa-spinner fa-spin';
        magicBtn.closest('button').disabled = true;
    }

    const context = `
Game Name: ${state.currentProject.name}
Genre: ${state.currentProject.genre}
Platforms: ${state.currentProject.platforms.join(', ')}
Description: ${state.currentProject.description}

Existing GDD information:
${Object.entries(state.gddData).map(([key, val]) => {
        const sec = GDD_SECTIONS.find(s => s.id === key);
        return sec && val.content ? `\n### ${sec.title}\n${val.content.substring(0, 500)}...` : '';
    }).join('')}
`;

    const prompt = `
${context}

Based on the information above, create the "${section.title}" section of the GDD in a detailed and professional manner.

This section should include: ${section.prompt}

Write in an organized way using Markdown format with headings and subheadings.
`;

    const response = await streamGenerateWithOllama(prompt, '', (chunk, fullText) => {
        contentEl.innerHTML = parseMarkdown(fullText);
    });

    state.generatingSection = null;

    if (response) {
        state.gddData[sectionId] = { content: response };
        state.currentProject.updatedAt = new Date().toISOString();
        saveState();
        renderDocumentSections();
        updateWordCount();
        showToast(`${section.title} section generated!`, 'success');
    } else {
        // Restore placeholder on failure
        contentEl.innerHTML = `
            <div class="section-placeholder" onclick="generateSection('${sectionId}')">
                <i class="fas fa-robot"></i>
                <p>Generate content with AI</p>
            </div>
        `;
    }

    // Restore the button
    if (magicBtn) {
        magicBtn.className = 'fas fa-magic';
        magicBtn.closest('button').disabled = false;
    }
}

function editSection(sectionId) {
    const sectionData = state.gddData[sectionId] || {};
    const contentEl = document.getElementById(`content-${sectionId}`);
    const currentContent = sectionData.content || '';

    contentEl.innerHTML = `
        <textarea class="section-editor" id="editor-${sectionId}" rows="10">${currentContent}</textarea>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button class="btn btn-primary" onclick="saveSection('${sectionId}')">
                <i class="fas fa-save"></i> Save
            </button>
            <button class="btn btn-ghost" onclick="cancelEdit('${sectionId}')">
                Cancel
            </button>
        </div>
    `;

    const editor = document.getElementById(`editor-${sectionId}`);
    editor.style.cssText = `
        width: 100%;
        padding: 16px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-family: var(--font-mono);
        font-size: 0.9rem;
        resize: vertical;
        outline: none;
    `;
}

function saveSection(sectionId) {
    const editor = document.getElementById(`editor-${sectionId}`);
    if (!editor) return;

    state.gddData[sectionId] = { content: editor.value };
    state.currentProject.updatedAt = new Date().toISOString();
    saveState();
    renderGDDContent();
    renderDocumentSections();
    showToast('Changes saved', 'success');
}

function cancelEdit(sectionId) {
    renderGDDContent();
}

// ===== Chat Functions =====
function openChat() {
    navigateTo('chat');
}

function useSuggestion(text) {
    document.getElementById('chatInput').value = text;
    sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    addChatMessage(message, 'user');
    input.value = '';
    input.style.height = 'auto';

    document.getElementById('chatSuggestions').style.display = 'none';

    const thinkingId = addChatMessage('<i class="fas fa-spinner fa-spin"></i> Thinking...', 'assistant', true);

    const context = buildChatContext();

    const systemPrompt = `
You are the GDD Studio AI assistant. You help users create Game Design Documents.

Your tasks:
1. Develop and refine game ideas
2. Generate detailed content for GDD sections
3. Provide suggestions about game mechanics, story, and characters
4. Generate Mermaid code for diagrams
5. Give professional and structured responses

When a user describes a game idea, suggest automatically creating:
- Game overview and concept
- Core gameplay loop
- Main mechanics
- Potential story elements

Current Project: ${state.currentProject ? state.currentProject.name : 'No project yet'}
`;

    const prompt = `
${context}

User: ${message}

Give a detailed and helpful response. Use Markdown format where appropriate.
`;

    const messageEl = document.getElementById(thinkingId);
    const contentEl = messageEl.querySelector('.message-content');

    const response = await streamGenerateWithOllama(prompt, systemPrompt, (chunk, fullText) => {
        contentEl.innerHTML = parseMarkdown(fullText);
        const container = document.getElementById('chatMessages');
        container.scrollTop = container.scrollHeight;
    });

    if (!response) {
        contentEl.innerHTML = '<p style="color: var(--accent-danger);">Could not get a response. Check your Ollama connection.</p>';
    }

    state.chatHistory.push({ role: 'user', content: message });
    state.chatHistory.push({ role: 'assistant', content: response || '' });

    if (!state.currentProject && response && (response.toLowerCase().includes('game') || response.toLowerCase().includes('design'))) {
        setTimeout(() => {
            addChatMessage(`
<p>💡 <strong>Tip:</strong> If you like your game idea, click "New Project" to start creating your GDD!</p>
<button class="btn btn-primary btn-sm" onclick="startNewProject()" style="margin-top: 8px;">
    <i class="fas fa-plus"></i> Create New Project
</button>
`, 'assistant');
        }, 1000);
    }
}

function addChatMessage(content, role, isThinking = false) {
    const container = document.getElementById('chatMessages');
    const id = 'msg-' + Date.now();

    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    div.id = id;

    const icon = role === 'user' ? 'fa-user' : 'fa-robot';

    div.innerHTML = `
        <div class="message-avatar"><i class="fas ${icon}"></i></div>
        <div class="message-content">${isThinking ? content : parseMarkdown(content)}</div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    return id;
}

function clearChat() {
    state.chatHistory = [];
    document.getElementById('chatMessages').innerHTML = `
        <div class="chat-message assistant">
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <p>Chat cleared. How can I help you?</p>
            </div>
        </div>
    `;
    document.getElementById('chatSuggestions').style.display = 'flex';
}

function buildChatContext() {
    const recentMessages = state.chatHistory.slice(-10);
    return recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
}

// ===== Diagram Functions =====
async function generateDiagram() {
    const type = document.getElementById('diagramType').value;
    if (!state.currentProject) {
        showToast('Create a project first', 'info');
        return;
    }

    // Show inline loading in the diagram preview area
    const previewEl = document.getElementById('diagramPreview');
    previewEl.innerHTML = `
        <div class="inline-loading">
            <div class="inline-spinner"></div>
            <span>Generating diagram...</span>
        </div>
    `;

    const diagramPrompts = {
        gameloop: `Create a Mermaid flowchart diagram showing the core game loop for ${state.currentProject.name}.`,
        mechanics: `Create a Mermaid diagram showing how the main mechanics relate to each other in ${state.currentProject.name}.`,
        progression: `Create a Mermaid diagram showing the player progression system in ${state.currentProject.name}.`,
        'ui-flow': `Create a Mermaid diagram showing the UI flow (menus, screens, transitions) of ${state.currentProject.name}.`,
        custom: `Create an appropriate Mermaid diagram for ${state.currentProject.name}.`
    };

    const prompt = `
${diagramPrompts[type]}

Game Information:
- Genre: ${state.currentProject.genre}
- Description: ${state.currentProject.description}

Return ONLY the Mermaid code, no other explanation. Do not use code block markers (backticks).
Write valid Mermaid syntax that will render correctly.
`;

    const response = await generateWithOllama(prompt);

    if (response) {
        let code = response
            .replace(/```mermaid/g, '')
            .replace(/```/g, '')
            .trim();

        document.getElementById('diagramCode').value = code;
        updateDiagram();
    } else {
        previewEl.innerHTML = '<p style="color: var(--accent-danger); text-align: center;">Failed to generate diagram.</p>';
    }
}

function updateDiagram() {
    const code = document.getElementById('diagramCode').value;
    const container = document.getElementById('diagramPreview');

    container.innerHTML = '<div class="mermaid"></div>';
    const mermaidDiv = container.querySelector('.mermaid');
    mermaidDiv.textContent = code;

    try {
        mermaid.init(undefined, mermaidDiv);
    } catch (error) {
        console.error('Mermaid error:', error);
        container.innerHTML = `<p style="color: var(--accent-danger);">Diagram error: ${error.message}</p>`;
    }
}

// ===== Export Functions =====
function exportAs(format) {
    if (!state.currentProject) {
        showToast('No project to export', 'error');
        return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
        case 'markdown':
            content = generateMarkdownExport();
            filename = `${state.currentProject.name}_GDD.md`;
            mimeType = 'text/markdown';
            break;
        case 'html':
            content = generateHTMLExport();
            filename = `${state.currentProject.name}_GDD.html`;
            mimeType = 'text/html';
            break;
        case 'json':
            content = JSON.stringify({ project: state.currentProject, gdd: state.gddData }, null, 2);
            filename = `${state.currentProject.name}_GDD.json`;
            mimeType = 'application/json';
            break;
        case 'pdf':
            const printWindow = window.open('', '_blank');
            printWindow.document.write(generateHTMLExport());
            printWindow.document.close();
            printWindow.print();
            return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Exported as ${format.toUpperCase()}!`, 'success');
}

function generateMarkdownExport() {
    let md = `# ${state.currentProject.name} - Game Design Document\n\n`;
    md += `**Created:** ${formatDate(state.currentProject.createdAt)}\n`;
    md += `**Last Updated:** ${formatDate(state.currentProject.updatedAt)}\n`;
    md += `**Genre:** ${state.currentProject.genre}\n`;
    md += `**Platforms:** ${state.currentProject.platforms.join(', ')}\n\n`;
    md += `---\n\n`;

    GDD_SECTIONS.forEach(section => {
        const data = state.gddData[section.id];
        md += `## ${section.title}\n\n`;
        if (data && data.content) {
            md += data.content + '\n\n';
        } else {
            md += '*This section has not been created yet.*\n\n';
        }
    });

    return md;
}

function generateHTMLExport() {
    const markdown = generateMarkdownExport();
    const htmlContent = parseMarkdown(markdown);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${state.currentProject.name} - GDD</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            background: #fff;
        }
        h1 { margin-bottom: 20px; color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { margin: 30px 0 15px; color: #2a2a2a; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
        h3 { margin: 20px 0 10px; color: #3a3a3a; }
        p { margin-bottom: 12px; }
        ul, ol { padding-left: 24px; margin-bottom: 12px; }
        li { margin-bottom: 6px; }
        strong { font-weight: 600; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
        hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
        @media print {
            body { padding: 20px; }
            h2 { page-break-before: always; }
            h2:first-of-type { page-break-before: avoid; }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;
}

// ===== Theme Functions =====
function toggleTheme() {
    state.isDarkTheme = !state.isDarkTheme;
    applyTheme();
    saveState();
}

function applyTheme() {
    const icon = document.querySelector('#themeToggle i');
    if (state.isDarkTheme) {
        document.documentElement.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
        mermaid.initialize({ theme: 'dark' });
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        icon.className = 'fas fa-sun';
        mermaid.initialize({ theme: 'default' });
    }
}

// ===== Utility Functions =====
function parseMarkdown(text) {
    if (!text) return '';
    return marked.parse(text);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateWordCount() {
    let totalWords = 0;
    Object.values(state.gddData).forEach(section => {
        if (section.content) {
            totalWords += section.content.split(/\s+/).filter(w => w).length;
        }
    });
    document.getElementById('wordCount').textContent = totalWords;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function toggleSidePanel() {
    document.getElementById('sidePanel').classList.toggle('visible');
}

function loadTemplate() {
    showToast('Template feature coming soon!', 'info');
}

// ===== State Persistence =====
function saveState() {
    const saveData = {
        currentProject: state.currentProject,
        gddData: state.gddData,
        selectedModel: state.selectedModel,
        isDarkTheme: state.isDarkTheme
    };
    localStorage.setItem('gdd-studio-state', JSON.stringify(saveData));
}

function loadState() {
    try {
        const saved = localStorage.getItem('gdd-studio-state');
        if (saved) {
            const data = JSON.parse(saved);
            state.currentProject = data.currentProject || null;
            state.gddData = data.gddData || {};
            state.selectedModel = data.selectedModel || CONFIG.defaultModel;
            state.isDarkTheme = data.isDarkTheme !== false;
        }
    } catch (error) {
        console.error('Failed to load state:', error);
    }
}

// ===== Global Exports =====
window.startNewProject = startNewProject;
window.openChat = openChat;
window.loadTemplate = loadTemplate;
window.createProject = createProject;
window.closeModal = closeModal;
window.generateSection = generateSection;
window.editSection = editSection;
window.saveSection = saveSection;
window.cancelEdit = cancelEdit;
window.clearChat = clearChat;
window.sendMessage = sendMessage;
window.useSuggestion = useSuggestion;
window.generateDiagram = generateDiagram;
window.updateDiagram = updateDiagram;
window.exportAs = exportAs;
window.toggleSidePanel = toggleSidePanel;
window.toggleSection = function(id) { /* Toggle collapse */ };
