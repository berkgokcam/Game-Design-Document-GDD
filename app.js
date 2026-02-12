/**
 * GDD Studio - Game Design Document Generator
 * AI-powered GDD creation tool using local Ollama models
 */

// ===== Configuration =====
const CONFIG = {
    ollamaUrl: 'http://localhost:11434',
    defaultModel: 'gpt-oss:20b',
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
    generatingSection: null, // track which section is being generated
    diagramHistory: [], // saved diagrams
    sectionPrompts: {} // custom user prompts per section
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
Write in Markdown format. Use headings, lists, and emphasis. Do not use emojis.
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

    // Genre chip multi-select
    document.querySelectorAll('.genre-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
        });
    });

    // Custom genre input
    const genreInput = document.getElementById('genreCustomInput');
    if (genreInput) {
        genreInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = genreInput.value.trim();
                if (!value) return;
                // Avoid duplicates
                const existing = document.querySelectorAll('.genre-tag');
                for (const tag of existing) {
                    if (tag.dataset.genre.toLowerCase() === value.toLowerCase()) return;
                }
                // Check if it matches a chip
                const matchingChip = document.querySelector(`.genre-chip[data-genre="${value}" i]`);
                if (matchingChip) {
                    matchingChip.classList.add('selected');
                    genreInput.value = '';
                    return;
                }
                addCustomGenreTag(value);
                genreInput.value = '';
            }
        });
    }

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

    // Import drag and drop
    const dropZone = document.getElementById('importDropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            const validExts = ['.json', '.md', '.html', '.htm'];
            const hasValidExt = validExts.some(ext => file?.name.toLowerCase().endsWith(ext));
            if (file && hasValidExt) {
                importProjectFile(file);
            } else {
                showToast('Please drop a .json, .md, or .html file', 'error');
            }
        });
    }
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
            initDiagramPanZoom();
            renderDiagramHistory();
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

function addCustomGenreTag(value) {
    const container = document.getElementById('genreSelectedTags');
    const tag = document.createElement('span');
    tag.className = 'genre-tag';
    tag.dataset.genre = value;
    tag.innerHTML = `${value} <i class="fas fa-times" onclick="removeCustomGenreTag(this)"></i>`;
    container.appendChild(tag);
}

function removeCustomGenreTag(icon) {
    icon.parentElement.remove();
}

function createProject() {
    const name = document.getElementById('newProjectName').value.trim();
    const desc = document.getElementById('newProjectDesc').value.trim();
    const platforms = Array.from(document.querySelectorAll('.checkbox-group input:checked'))
        .map(cb => cb.value);

    // Collect genres from selected chips + custom tags
    const selectedGenres = Array.from(document.querySelectorAll('.genre-chip.selected'))
        .map(chip => chip.dataset.genre);
    const customTags = Array.from(document.querySelectorAll('.genre-tag'))
        .map(tag => tag.dataset.genre);
    const allGenres = [...new Set([...selectedGenres, ...customTags])];
    const genre = allGenres.length > 0 ? allGenres.join(', ') : 'Unspecified';

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

    // Reset form
    document.getElementById('newProjectName').value = '';
    document.getElementById('newProjectDesc').value = '';
    document.querySelectorAll('.genre-chip.selected').forEach(c => c.classList.remove('selected'));
    document.getElementById('genreSelectedTags').innerHTML = '';
    document.getElementById('genreCustomInput').value = '';
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
        const customPrompt = state.sectionPrompts[section.id] || '';

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
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); togglePromptInput('${section.id}')" title="Custom Prompt">
                        <i class="fas fa-comment-dots"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); generateSection('${section.id}')" title="Generate with AI" ${isGenerating ? 'disabled' : ''}>
                        <i class="fas ${isGenerating ? 'fa-spinner fa-spin' : 'fa-magic'}"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); editSection('${section.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            <div class="section-prompt-area hidden" id="prompt-area-${section.id}">
                <div class="prompt-input-wrapper">
                    <i class="fas fa-lightbulb prompt-icon"></i>
                    <textarea class="section-prompt-input" id="prompt-${section.id}" 
                        placeholder="Add custom instructions for AI... (e.g. 'Include a skill tree system', 'Focus on stealth mechanics', 'Add multiplayer features')" 
                        rows="2">${customPrompt}</textarea>
                </div>
                <div class="prompt-actions">
                    <button class="btn btn-primary btn-sm" onclick="generateSectionWithPrompt('${section.id}')">
                        <i class="fas fa-magic"></i> Generate with Custom Prompt
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="clearSectionPrompt('${section.id}')">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </div>
            </div>
            <div class="gdd-section-content" id="content-${section.id}">
                ${hasContent ? parseMarkdown(sectionData.content) : `
                    <div class="section-placeholder" onclick="togglePromptInput('${section.id}')">
                        <i class="fas fa-robot"></i>
                        <p>Click to add custom instructions or generate with AI</p>
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

    const customPrompt = state.sectionPrompts[sectionId] || '';
    const existingContent = state.gddData[sectionId]?.content?.trim() || '';

    // Determine mode: update existing vs generate fresh
    const isUpdate = existingContent && customPrompt;

    // Show inline loading indicator inside the section
    contentEl.innerHTML = `
        <div class="inline-loading">
            <div class="inline-spinner"></div>
            <span>AI is ${isUpdate ? 'updating' : 'writing'} the <strong>${section.title}</strong> section...</span>
        </div>
    `;

    // Update the button to show spinner
    const sectionEl = document.getElementById(`section-${sectionId}`);
    const magicBtn = sectionEl?.querySelector('.fa-magic, .fa-spinner');
    if (magicBtn) {
        magicBtn.className = 'fas fa-spinner fa-spin';
        magicBtn.closest('button').disabled = true;
    }

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const context = `
Game Name: ${state.currentProject.name}
Genre: ${state.currentProject.genre}
Platforms: ${state.currentProject.platforms.join(', ')}
Description: ${state.currentProject.description}
Project Created: ${new Date(state.currentProject.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Today's Date: ${todayStr}
`;

    let prompt;

    if (isUpdate) {
        // MODE: Update/modify existing content based on custom prompt
        prompt = `
${context}

Here is the CURRENT content of the "${section.title}" section:

---
${existingContent}
---

The user wants to MODIFY/UPDATE this section with the following instructions:
${customPrompt}

IMPORTANT RULES:
- Keep the existing content structure and information intact
- Apply ONLY the changes the user requested
- Do NOT remove or rewrite parts that the user didn't mention
- Add new content where appropriate based on the user's instructions
- Maintain the same writing style and Markdown formatting
- Return the COMPLETE updated section (not just the changes)
${sectionId === 'timeline' ? `- Today's date is ${todayStr}. All dates must be realistic and in the future starting from today.` : ''}

Write in Markdown format with headings and subheadings.
`;
    } else {
        // MODE: Generate from scratch — exclude THIS section's old content entirely
        const otherSections = Object.entries(state.gddData).map(([key, val]) => {
            const sec = GDD_SECTIONS.find(s => s.id === key);
            return sec && val.content && key !== sectionId ? `\n### ${sec.title}\n${val.content.substring(0, 500)}` : '';
        }).filter(Boolean).join('');

        prompt = `
${context}

${otherSections ? `Other GDD sections for reference:\n${otherSections}` : ''}

Create the "${section.title}" section of the GDD from scratch. This is a FRESH generation — ignore any previous version of this section.

This section should include: ${section.prompt}
${sectionId === 'timeline' ? `\nIMPORTANT: Today's date is ${todayStr}. All milestone and phase dates MUST be realistic future dates starting from today. Do NOT use past dates or placeholder years.` : ''}

${customPrompt ? `User's custom instructions:\n${customPrompt}\n` : ''}

Write in an organized way using Markdown format with headings and subheadings.
`;
    }

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
        showToast(`${section.title} section ${isUpdate ? 'updated' : 'generated'}!`, 'success');
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

    // Smart context: detect which section(s) the user is asking about
    const relevantSectionIds = detectRelevantSections(message);

    // Build targeted GDD context
    let gddContext = '';
    if (state.currentProject) {
        const chatTodayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        gddContext += `\n--- PROJECT ---\n`;
        gddContext += `Name: ${state.currentProject.name} | Genre: ${state.currentProject.genre} | Platforms: ${state.currentProject.platforms.join(', ')}\n`;
        gddContext += `Today's Date: ${chatTodayStr}\n`;
        if (state.currentProject.description) {
            gddContext += `Description: ${state.currentProject.description}\n`;
        }

        const filledSections = GDD_SECTIONS.filter(s => state.gddData[s.id]?.content?.trim());

        if (filledSections.length > 0) {
            // Separate relevant vs other sections
            const relevant = filledSections.filter(s => relevantSectionIds.includes(s.id));
            const others = filledSections.filter(s => !relevantSectionIds.includes(s.id));

            // Send relevant sections in FULL
            if (relevant.length > 0) {
                gddContext += `\n--- RELEVANT SECTIONS (full content) ---\n`;
                relevant.forEach(s => {
                    const content = state.gddData[s.id].content.trim();
                    gddContext += `\n### ${s.title}\n${content}\n`;
                });
            }

            // List other sections as brief summaries
            if (others.length > 0) {
                gddContext += `\n--- OTHER SECTIONS (summaries) ---\n`;
                others.forEach(s => {
                    const content = state.gddData[s.id].content.trim();
                    const firstLine = content.split('\n').find(l => l.trim() && !l.trim().startsWith('#')) || content.substring(0, 80);
                    gddContext += `- ${s.title}: ${firstLine.substring(0, 100).trim()}...\n`;
                });
            }
        }

        // List empty sections
        const emptySections = GDD_SECTIONS.filter(s => !state.gddData[s.id]?.content?.trim());
        if (emptySections.length > 0) {
            gddContext += `\nEmpty sections (not yet written): ${emptySections.map(s => s.title).join(', ')}\n`;
        }
    }

    const systemPrompt = `
You are the GDD Studio AI assistant. You help users create and refine Game Design Documents.

Your capabilities:
1. Answer questions about the current GDD document using the provided content
2. Suggest improvements, find gaps or inconsistencies
3. Generate new content for empty or incomplete sections
4. Provide professional game design feedback
5. Generate Mermaid diagram code when requested

IMPORTANT: The relevant section(s) for this question are provided in FULL below. Use this actual content — do NOT invent details that contradict the document. Other sections are shown as brief summaries for context.
${gddContext}
`;

    const prompt = `
${context}

User: ${message}

Respond based on the actual GDD document content provided. Be specific and reference the document when relevant. Use Markdown format.
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

// Detect which GDD section(s) the user's message is about
function detectRelevantSections(message) {
    const lower = message.toLowerCase();

    // Keyword map: section id -> keywords (EN + TR)
    const sectionKeywords = {
        overview: ['overview', 'genel bakış', 'konsept', 'concept', 'vision', 'vizyon', 'game idea', 'oyun fikri', 'target audience', 'hedef kitle', 'unique selling', 'genre', 'tür'],
        gameplay: ['gameplay', 'mechanic', 'mekanik', 'kontrol', 'control', 'combat', 'savaş', 'dövüş', 'game loop', 'oynanış', 'system', 'sistem', 'ability', 'yetenek', 'skill', 'beceri', 'movement', 'hareket'],
        story: ['story', 'hikaye', 'narrative', 'anlatı', 'plot', 'olay örgüsü', 'lore', 'backstory', 'quest', 'görev', 'dialog', 'diyalog', 'theme', 'tema', 'ending', 'son', 'senaryo', 'scenario'],
        characters: ['character', 'karakter', 'protagonist', 'antagonist', 'düşman', 'enemy', 'npc', 'hero', 'kahraman', 'villain', 'boss', 'companion', 'partner', 'ally', 'müttefik'],
        world: ['world', 'dünya', 'level', 'seviye', 'bölüm', 'map', 'harita', 'environment', 'ortam', 'çevre', 'location', 'lokasyon', 'mekan', 'biome', 'terrain', 'arazi', 'zone'],
        art: ['art', 'sanat', 'visual', 'görsel', 'style', 'stil', 'ui', 'ux', 'design', 'tasarım', 'color', 'renk', 'palette', 'palet', 'aesthetic', 'estetik', 'arayüz', 'interface', 'animation', 'animasyon'],
        audio: ['audio', 'ses', 'sound', 'müzik', 'music', 'sfx', 'effect', 'voice', 'seslendirme', 'ambient', 'ortam sesi', 'soundtrack'],
        technical: ['technical', 'teknik', 'engine', 'motor', 'platform', 'requirement', 'gereksinim', 'performance', 'performans', 'optimization', 'network', 'ağ', 'multiplayer', 'server', 'sunucu', 'spec', 'hardware', 'donanım'],
        monetization: ['monetiz', 'gelir', 'revenue', 'price', 'fiyat', 'dlc', 'microtransaction', 'in-app', 'ücret', 'business', 'iş modeli', 'free-to-play', 'premium', 'subscription', 'abonelik', 'store', 'mağaza'],
        timeline: ['timeline', 'zaman', 'schedule', 'takvim', 'milestone', 'roadmap', 'yol haritası', 'deadline', 'sprint', 'phase', 'aşama', 'release', 'yayın', 'launch', 'çıkış']
    };

    // Check for broad/general questions
    const broadKeywords = ['tüm', 'bütün', 'hepsi', 'genel', 'dokuman', 'document', 'entire', 'all section', 'whole', 'everything', 'review', 'incele', 'özet', 'summary', 'eksik', 'missing', 'gap'];
    const isBroad = broadKeywords.some(kw => lower.includes(kw));

    if (isBroad) {
        // Return all filled sections for broad questions
        return GDD_SECTIONS
            .filter(s => state.gddData[s.id]?.content?.trim())
            .map(s => s.id);
    }

    // Score each section by keyword matches
    const scores = {};
    for (const [sectionId, keywords] of Object.entries(sectionKeywords)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) score++;
        }
        if (score > 0) scores[sectionId] = score;
    }

    // Return sections with matches, sorted by relevance
    const matched = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

    // If nothing matched, return empty (AI will work with project info only)
    return matched;
}
// ===== Custom Prompt Functions =====
function togglePromptInput(sectionId) {
    const promptArea = document.getElementById(`prompt-area-${sectionId}`);
    if (promptArea) {
        promptArea.classList.toggle('hidden');
        if (!promptArea.classList.contains('hidden')) {
            const textarea = document.getElementById(`prompt-${sectionId}`);
            if (textarea) textarea.focus();
        }
    }
}

function generateSectionWithPrompt(sectionId) {
    const textarea = document.getElementById(`prompt-${sectionId}`);
    if (textarea) {
        state.sectionPrompts[sectionId] = textarea.value;
        saveState();
    }
    generateSection(sectionId);
}

function clearSectionPrompt(sectionId) {
    const textarea = document.getElementById(`prompt-${sectionId}`);
    if (textarea) textarea.value = '';
    state.sectionPrompts[sectionId] = '';
    saveState();
    showToast('Custom prompt cleared', 'info');
}

// ===== Diagram Functions =====
const DIAGRAM_TYPES = {
    gameloop: { label: 'Game Loop', icon: 'fa-sync-alt', desc: 'Core gameplay loop flow' },
    mechanics: { label: 'Mechanic Relations', icon: 'fa-cogs', desc: 'How mechanics interact' },
    progression: { label: 'Progression System', icon: 'fa-chart-line', desc: 'Player progression path' },
    'ui-flow': { label: 'UI Flow', icon: 'fa-mobile-alt', desc: 'Screen navigation flow' },
    'class-diagram': { label: 'Class Diagram', icon: 'fa-sitemap', desc: 'OOP class structure' },
    'state-diagram': { label: 'State Diagram', icon: 'fa-exchange-alt', desc: 'Game state transitions' },
    'er-diagram': { label: 'ER Diagram', icon: 'fa-database', desc: 'Data entity relationships' },
    'sequence': { label: 'Sequence Diagram', icon: 'fa-list-ol', desc: 'Interaction sequences' },
    'mindmap': { label: 'Mind Map', icon: 'fa-brain', desc: 'Concept brainstorming map' },
    'timeline': { label: 'Timeline', icon: 'fa-calendar-alt', desc: 'Development timeline' },
    custom: { label: 'Custom', icon: 'fa-pencil-alt', desc: 'Your own diagram type' }
};

async function generateDiagram() {
    const type = document.getElementById('diagramType').value;
    const customDiagramPrompt = document.getElementById('diagramCustomPrompt').value.trim();
    const existingCode = document.getElementById('diagramCode').value.trim();

    if (!state.currentProject) {
        showToast('Create a project first', 'info');
        return;
    }

    // Determine if we're modifying existing or generating new
    const isModifying = existingCode && customDiagramPrompt;

    // Show inline loading
    const previewEl = document.getElementById('diagramPreview');
    previewEl.innerHTML = `
        <div class="inline-loading">
            <div class="inline-spinner"></div>
            <span>${isModifying ? 'Updating' : 'Generating'} ${DIAGRAM_TYPES[type]?.label || ''} diagram...</span>
        </div>
    `;

    const generateBtn = document.getElementById('generateDiagramBtn');
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isModifying ? 'Updating...' : 'Generating...'}`;
    }

    const diagramPrompts = {
        gameloop: `Create a Mermaid flowchart diagram showing the core game loop for ${state.currentProject.name}. Show the main cycle: Start -> Core Actions -> Feedback -> Reward -> Decision -> Repeat.`,
        mechanics: `Create a Mermaid diagram showing how all the main mechanics relate to and interact with each other in ${state.currentProject.name}. Use a graph TD or LR layout.`,
        progression: `Create a Mermaid diagram showing the complete player progression system in ${state.currentProject.name}. Include levels, unlocks, skill trees, and milestones.`,
        'ui-flow': `Create a Mermaid flowchart diagram showing the complete UI flow (all menus, screens, and transitions) of ${state.currentProject.name}.`,
        'class-diagram': `Create a Mermaid classDiagram showing the main class structure for ${state.currentProject.name}. Include key classes like Player, Enemy, GameManager, Item, etc. with their properties and methods.`,
        'state-diagram': `Create a Mermaid stateDiagram-v2 showing the main game states and transitions for ${state.currentProject.name}. Include states like MainMenu, Loading, Playing, Paused, GameOver, etc.`,
        'er-diagram': `Create a Mermaid erDiagram showing the data entity relationships for ${state.currentProject.name}. Include entities like Player, Inventory, Item, Quest, NPC, etc.`,
        'sequence': `Create a Mermaid sequence diagram showing a key interaction sequence in ${state.currentProject.name}. For example combat flow or quest interaction.`,
        'mindmap': `Create a Mermaid mindmap diagram brainstorming the key concepts and features of ${state.currentProject.name}.`,
        'timeline': `Create a Mermaid timeline diagram showing the development phases and milestones for ${state.currentProject.name}.`,
        custom: `Create an appropriate Mermaid diagram for ${state.currentProject.name}.`
    };

    const gddContext = Object.entries(state.gddData).map(([key, val]) => {
        const sec = GDD_SECTIONS.find(s => s.id === key);
        return sec && val.content ? `${sec.title}: ${val.content.substring(0, 300)}` : '';
    }).filter(Boolean).join('\n');

    let prompt;

    if (isModifying) {
        // MODE: Modify/extend existing diagram
        prompt = `
You have an existing Mermaid diagram for the game "${state.currentProject.name}":

\`\`\`mermaid
${existingCode}
\`\`\`

The user wants to MODIFY or EXTEND this diagram with the following instructions:
${customDiagramPrompt}

IMPORTANT RULES:
- Keep ALL existing nodes, connections, and structure from the current diagram
- ADD or MODIFY only what the user requested
- Do NOT remove existing elements unless the user explicitly asks to remove something
- Maintain the same diagram type and style
- Return the COMPLETE updated Mermaid code (not just the changes)

Return ONLY the updated Mermaid code, no explanations. Do not use code block markers (backticks).
Write valid Mermaid syntax that will render correctly.
`;
    } else {
        // MODE: Generate new diagram from scratch
        prompt = `
${diagramPrompts[type]}

Game Information:
- Name: ${state.currentProject.name}
- Genre: ${state.currentProject.genre}
- Platforms: ${state.currentProject.platforms.join(', ')}
- Description: ${state.currentProject.description}

${gddContext ? `GDD Context:\n${gddContext}` : ''}

${customDiagramPrompt ? `IMPORTANT - User's custom instructions:\n${customDiagramPrompt}\n\nIncorporate the user's specific requests into the diagram.` : ''}

Return ONLY the Mermaid code, no other explanation. Do not use code block markers (backticks).
Write valid Mermaid syntax that will render correctly. Keep the diagram readable and not too complex.
`;
    }

    const response = await generateWithOllama(prompt);

    if (response) {
        let code = response
            .replace(/```mermaid/g, '')
            .replace(/```/g, '')
            .trim();

        document.getElementById('diagramCode').value = code;
        updateDiagram();
        showToast(`${DIAGRAM_TYPES[type]?.label || 'Custom'} diagram ${isModifying ? 'updated' : 'generated'}!`, 'success');
    } else {
        previewEl.innerHTML = '<p style="color: var(--accent-danger); text-align: center;">Failed to generate diagram. Check your Ollama connection.</p>';
    }

    if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate';
    }
}

function updateDiagram() {
    const code = document.getElementById('diagramCode').value;
    const container = document.getElementById('diagramPreview');

    // Create inner wrapper for pan/zoom transforms
    container.innerHTML = '<div class="diagram-preview-inner"><div class="mermaid"></div></div>';
    const mermaidDiv = container.querySelector('.mermaid');
    mermaidDiv.textContent = code;

    try {
        mermaid.init(undefined, mermaidDiv);
    } catch (error) {
        console.error('Mermaid error:', error);
        container.innerHTML = `<p style="color: var(--accent-danger);">Diagram error: ${error.message}</p>`;
    }

    // Reset pan/zoom
    diagramTransform = { x: 0, y: 0, scale: 1 };
    applyDiagramTransform();
}

// ---- Diagram Pan & Zoom State ----
let diagramTransform = { x: 0, y: 0, scale: 1 };
let diagramDrag = { active: false, startX: 0, startY: 0, startTx: 0, startTy: 0 };

function applyDiagramTransform() {
    const inner = document.querySelector('#diagramPreview .diagram-preview-inner');
    if (inner) {
        inner.style.transform = `translate(${diagramTransform.x}px, ${diagramTransform.y}px) scale(${diagramTransform.scale})`;
    }
    const label = document.getElementById('diagramZoomLevel');
    if (label) {
        label.textContent = Math.round(diagramTransform.scale * 100) + '%';
    }
}

function diagramZoom(action, mouseX, mouseY) {
    const preview = document.getElementById('diagramPreview');
    if (!preview) return;

    const rect = preview.getBoundingClientRect();
    // Default to center of preview if no mouse position given
    const cx = mouseX !== undefined ? mouseX - rect.left : rect.width / 2;
    const cy = mouseY !== undefined ? mouseY - rect.top : rect.height / 2;

    const oldScale = diagramTransform.scale;
    let newScale;

    if (action === 'in') {
        newScale = Math.min(oldScale * 1.2, 5);
    } else if (action === 'out') {
        newScale = Math.max(oldScale / 1.2, 0.1);
    } else if (action === 'reset') {
        diagramTransform = { x: 0, y: 0, scale: 1 };
        applyDiagramTransform();
        return;
    } else {
        return;
    }

    // Zoom toward mouse position:
    // The point under the mouse should stay in the same screen position
    const ratio = newScale / oldScale;
    diagramTransform.x = cx - ratio * (cx - diagramTransform.x);
    diagramTransform.y = cy - ratio * (cy - diagramTransform.y);
    diagramTransform.scale = newScale;
    applyDiagramTransform();
}

function initDiagramPanZoom() {
    const preview = document.getElementById('diagramPreview');
    if (!preview || preview.dataset.panZoomInit) return;
    preview.dataset.panZoomInit = 'true';

    // Wheel zoom (mouse-position based)
    preview.addEventListener('wheel', (e) => {
        e.preventDefault();
        const action = e.deltaY < 0 ? 'in' : 'out';
        diagramZoom(action, e.clientX, e.clientY);
    }, { passive: false });

    // Left-click drag to pan
    preview.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // left click only
        diagramDrag.active = true;
        diagramDrag.startX = e.clientX;
        diagramDrag.startY = e.clientY;
        diagramDrag.startTx = diagramTransform.x;
        diagramDrag.startTy = diagramTransform.y;
        preview.classList.add('dragging');
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!diagramDrag.active) return;
        diagramTransform.x = diagramDrag.startTx + (e.clientX - diagramDrag.startX);
        diagramTransform.y = diagramDrag.startTy + (e.clientY - diagramDrag.startY);
        applyDiagramTransform();
    });

    window.addEventListener('mouseup', () => {
        if (diagramDrag.active) {
            diagramDrag.active = false;
            const preview = document.getElementById('diagramPreview');
            if (preview) preview.classList.remove('dragging');
        }
    });
}

function saveDiagram() {
    const code = document.getElementById('diagramCode').value.trim();
    const type = document.getElementById('diagramType').value;
    if (!code) {
        showToast('No diagram to save', 'info');
        return;
    }

    const diagram = {
        id: Date.now(),
        type: type,
        label: DIAGRAM_TYPES[type]?.label || 'Custom',
        code: code,
        createdAt: new Date().toISOString()
    };

    state.diagramHistory.unshift(diagram);
    if (state.diagramHistory.length > 20) state.diagramHistory.pop();
    saveState();
    renderDiagramHistory();
    showToast('Diagram saved!', 'success');
}

function loadDiagram(id) {
    const diagram = state.diagramHistory.find(d => d.id === id);
    if (diagram) {
        document.getElementById('diagramCode').value = diagram.code;
        document.getElementById('diagramType').value = diagram.type;
        updateDiagram();
        showToast(`Loaded: ${diagram.label}`, 'info');
    }
}

function deleteDiagram(id) {
    state.diagramHistory = state.diagramHistory.filter(d => d.id !== id);
    saveState();
    renderDiagramHistory();
    showToast('Diagram deleted', 'info');
}

function renderDiagramHistory() {
    const container = document.getElementById('diagramHistoryList');
    if (!container) return;

    if (state.diagramHistory.length === 0) {
        container.innerHTML = '<p class="diagram-history-empty"><i class="fas fa-folder-open"></i> No saved diagrams yet</p>';
        return;
    }

    container.innerHTML = state.diagramHistory.map(d => `
        <div class="diagram-history-item" onclick="loadDiagram(${d.id})">
            <div class="diagram-history-info">
                <i class="fas ${DIAGRAM_TYPES[d.type]?.icon || 'fa-project-diagram'}"></i>
                <span>${d.label}</span>
            </div>
            <div class="diagram-history-actions">
                <span class="diagram-history-date">${new Date(d.createdAt).toLocaleDateString()}</span>
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); deleteDiagram(${d.id})" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function exportDiagramSVG() {
    const svgEl = document.querySelector('#diagramPreview svg');
    if (!svgEl) {
        showToast('No diagram to export', 'info');
        return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentProject?.name || 'diagram'}_${document.getElementById('diagramType').value}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Diagram exported as SVG!', 'success');
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
            content = JSON.stringify({
                project: state.currentProject,
                gdd: state.gddData,
                sectionPrompts: state.sectionPrompts || {},
                diagramHistory: state.diagramHistory || [],
                chatHistory: state.chatHistory || [],
                exportedAt: new Date().toISOString(),
                version: '1.1'
            }, null, 2);
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

// ===== Import Functions =====
function triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.md,.html,.htm';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) importProjectFile(file);
    };
    input.click();
}

function importProjectFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const ext = file.name.split('.').pop().toLowerCase();

            let result;
            if (ext === 'json') {
                result = parseJSONImport(content);
            } else if (ext === 'md') {
                result = parseMarkdownImport(content);
            } else if (ext === 'html' || ext === 'htm') {
                result = parseHTMLImport(content);
            } else {
                showToast('Unsupported file format. Use .json, .md, or .html', 'error');
                return;
            }

            if (!result) return;

            // Apply imported data
            state.currentProject = result.project;
            state.gddData = result.gdd;
            if (result.sectionPrompts) state.sectionPrompts = result.sectionPrompts;
            if (result.diagramHistory) state.diagramHistory = result.diagramHistory;
            if (result.chatHistory) state.chatHistory = result.chatHistory;

            state.currentProject.updatedAt = new Date().toISOString();

            saveState();
            renderDocumentSections();
            navigateTo('gdd');

            const sectionCount = Object.keys(result.gdd).filter(k => result.gdd[k]?.content).length;
            showToast(`Project "${result.project.name}" imported from ${ext.toUpperCase()}! (${sectionCount} sections)`, 'success');
        } catch (error) {
            console.error('Import error:', error);
            showToast('Failed to import file. Check the file format.', 'error');
        }
    };
    reader.onerror = () => {
        showToast('Failed to read file.', 'error');
    };
    reader.readAsText(file);
}

function parseJSONImport(content) {
    const data = JSON.parse(content);
    if (!data.project || !data.gdd) {
        showToast('Invalid JSON: missing project or gdd data.', 'error');
        return null;
    }
    return data;
}

function parseMarkdownImport(mdContent) {
    const lines = mdContent.split('\n');
    let projectName = 'Imported Project';
    let genre = '';
    let platforms = [];
    let createdAt = new Date().toISOString();
    const gddData = {};

    // Extract project name from first H1: "# Name - Game Design Document" or just "# Name"
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].trim();
        if (line.startsWith('# ') && !line.startsWith('## ')) {
            projectName = line.replace(/^#\s+/, '').replace(/\s*[-\u2013\u2014]\s*Game Design Document$/i, '').trim();
            break;
        }
    }

    // Extract metadata from header area (before first ## or ---)
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].trim();
        const createdMatch = line.match(/^\*\*Created:\*\*\s*(.+)/i);
        if (createdMatch) {
            try { createdAt = new Date(createdMatch[1]).toISOString(); } catch (e) { }
        }
        const genreMatch = line.match(/^\*\*Genre:\*\*\s*(.+)/i);
        if (genreMatch) genre = genreMatch[1].trim();
        const platformMatch = line.match(/^\*\*Platforms?:\*\*\s*(.+)/i);
        if (platformMatch) platforms = platformMatch[1].split(',').map(p => p.trim());
    }

    // Build a set of known GDD section titles (lowercase, stripped)
    const knownSectionTitles = {};
    GDD_SECTIONS.forEach(s => {
        knownSectionTitles[normalizeSectionTitle(s.title)] = s.id;
    });

    // PASS 1: Scan for ## headings that EXACTLY match a known GDD section title
    // All other ## headings are treated as content within the current section
    const sectionBoundaries = []; // { lineIndex, sectionId }
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
            const heading = trimmed.replace(/^##\s+/, '').trim();
            const sectionId = isGddSectionHeading(heading, knownSectionTitles);
            if (sectionId) {
                sectionBoundaries.push({ lineIndex: i, sectionId });
            }
        }
    }

    // PASS 2: Collect content between boundaries
    for (let b = 0; b < sectionBoundaries.length; b++) {
        const startLine = sectionBoundaries[b].lineIndex + 1; // skip the ## heading itself
        const endLine = b + 1 < sectionBoundaries.length
            ? sectionBoundaries[b + 1].lineIndex
            : lines.length;

        const contentLines = lines.slice(startLine, endLine);
        const content = contentLines.join('\n').trim();
        if (content) {
            gddData[sectionBoundaries[b].sectionId] = {
                content: content,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    // Fallback: if no ## boundaries found, try splitting by # headings
    if (sectionBoundaries.length === 0) {
        let currentSectionId = null;
        let currentContent = [];

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
                if (currentSectionId) {
                    gddData[currentSectionId] = {
                        content: currentContent.join('\n').trim(),
                        lastUpdated: new Date().toISOString()
                    };
                }
                const heading = trimmed.replace(/^#\s+/, '').trim();
                const sectionId = isGddSectionHeading(heading, knownSectionTitles);
                currentSectionId = sectionId || fallbackSectionId(heading);
                currentContent = [];
            } else if (currentSectionId) {
                currentContent.push(lines[i]);
            }
        }

        if (currentSectionId && currentContent.length > 0) {
            gddData[currentSectionId] = {
                content: currentContent.join('\n').trim(),
                lastUpdated: new Date().toISOString()
            };
        }
    }

    return {
        project: {
            name: projectName,
            genre: genre || 'Unknown',
            platforms: platforms.length > 0 ? platforms : ['PC'],
            createdAt: createdAt,
            updatedAt: new Date().toISOString()
        },
        gdd: gddData
    };
}

// Normalize a title for comparison: lowercase, strip emojis/special chars, collapse spaces
function normalizeSectionTitle(title) {
    return title.toLowerCase()
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FFFF}]/gu, '') // strip emojis
        .replace(/[^a-z0-9\s&]/g, '') // keep only alphanumeric, spaces, &
        .replace(/\s+/g, ' ')
        .trim();
}

// Check if a heading exactly matches a known GDD section title
// Returns section id if match, null otherwise
function isGddSectionHeading(heading, knownSectionTitles) {
    const normalized = normalizeSectionTitle(heading);

    // Direct exact match
    if (knownSectionTitles[normalized]) return knownSectionTitles[normalized];

    // Check if normalized heading exactly equals a known title
    for (const [title, id] of Object.entries(knownSectionTitles)) {
        if (normalized === title) return id;
    }

    // Strict containment: heading must be EXACTLY a known title
    // (e.g. "Game Overview" matches, but "1️⃣ Game Overview" does NOT)
    // We allow minor prefix/suffix like "& " or extra spaces
    for (const [title, id] of Object.entries(knownSectionTitles)) {
        // The normalized heading must start and end with the title (allow surrounding whitespace)
        if (normalized === title) return id;
    }

    return null;
}

function fallbackSectionId(heading) {
    return normalizeSectionTitle(heading).replace(/\s+/g, '-').substring(0, 30) || 'custom-' + Date.now();
}

function parseHTMLImport(htmlContent) {
    // Extract text content from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Try to find a structured body content
    const body = doc.body;
    if (!body) {
        showToast('Invalid HTML file: no body content found.', 'error');
        return null;
    }

    // Convert HTML back to rough markdown
    let markdown = '';
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === Node.TEXT_NODE) {
            markdown += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            if (tag === 'h1') markdown += '\n# ';
            else if (tag === 'h2') markdown += '\n## ';
            else if (tag === 'h3') markdown += '\n### ';
            else if (tag === 'h4') markdown += '\n#### ';
            else if (tag === 'p') markdown += '\n';
            else if (tag === 'br') markdown += '\n';
            else if (tag === 'hr') markdown += '\n---\n';
            else if (tag === 'li') markdown += '\n- ';
            else if (tag === 'strong' || tag === 'b') markdown += '**';
            else if (tag === 'em' || tag === 'i') markdown += '*';
        }
    }

    // Parse the extracted markdown
    return parseMarkdownImport(markdown);
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
        isDarkTheme: state.isDarkTheme,
        diagramHistory: state.diagramHistory || [],
        sectionPrompts: state.sectionPrompts || {}
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
            state.diagramHistory = data.diagramHistory || [];
            state.sectionPrompts = data.sectionPrompts || {};
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
window.toggleSection = function (id) { /* Toggle collapse */ };
window.togglePromptInput = togglePromptInput;
window.generateSectionWithPrompt = generateSectionWithPrompt;
window.clearSectionPrompt = clearSectionPrompt;
window.saveDiagram = saveDiagram;
window.loadDiagram = loadDiagram;
window.deleteDiagram = deleteDiagram;
window.exportDiagramSVG = exportDiagramSVG;
window.renderDiagramHistory = renderDiagramHistory;
window.triggerImport = triggerImport;
window.importProjectFile = importProjectFile;
window.addCustomGenreTag = addCustomGenreTag;
window.removeCustomGenreTag = removeCustomGenreTag;
window.diagramZoom = diagramZoom;
