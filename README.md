# GDD Studio 🎮

AI-powered Game Design Document (GDD) creation tool. Create professional game design documents using local Ollama models.

![GDD Studio](https://img.shields.io/badge/GDD-Studio-blue?style=for-the-badge)
![Ollama](https://img.shields.io/badge/Ollama-Powered-green?style=for-the-badge)

## ✨ Features

- **AI Chat Assistant** - Develop your game ideas, brainstorm with AI
- **Automatic GDD Generation** - Auto-fill 10 different sections with AI
- **Mermaid Diagrams** - Game loop, mechanic relations, UI flow diagrams
- **Multiple Export Formats** - Markdown, HTML, PDF, JSON
- **Dark/Light Theme** - Eye-friendly themes to reduce strain
- **Obsidian/Figma Style UI** - Modern, minimal, and functional interface
- **Local Data** - All data is stored in your browser

## 📋 GDD Sections

1. **Game Overview** - Concept, genre, target audience
2. **Gameplay Mechanics** - Core loop, controls, systems
3. **Story & Narrative** - Main story, narrative structure
4. **Characters** - Main/supporting characters, enemies, NPCs
5. **World & Level Design** - Locations, environment design
6. **Art Style** - Art direction, color palette, UI/UX
7. **Sound Design** - Music, sound effects, voice acting
8. **Technical Requirements** - Engine, platform, system requirements
9. **Monetization** - Revenue model, pricing
10. **Timeline** - Milestones, development plan

## 🚀 Setup

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com/download
```

### 2. Download a Model

```bash
# Recommended models
ollama pull llama3.2
ollama pull mistral
ollama pull neural-chat
```

### 3. Start Ollama

```bash
ollama serve
```

### 4. Open GDD Studio

Open `index.html` in your browser or start a local server:

```bash
# With Python
python -m http.server 8000

# With Node.js
npx serve .

# You can also use the VS Code Live Server extension
```

Then navigate to `http://localhost:8000`.

## 🎯 Usage

### Creating a New Project

1. Click the "New Project" button
2. Enter the game title, genre, and description
3. Select platforms
4. Click "Create"

### Generating Content with AI

1. Select a section from the left menu
2. Click the "🪄" (magic wand) icon
3. AI will automatically fill in the section
4. You can edit the content afterwards

### Brainstorming with AI Chat

1. Select "AI Chat" from the left menu
2. Describe your game idea
3. AI will provide suggestions
4. You can also use the quick suggestion buttons

### Creating Diagrams

1. Go to the "Diagrams" tab
2. Select the diagram type
3. Click "Generate"
4. You can edit the Mermaid code

### Exporting

1. Go to the "Export" tab
2. Choose a format (Markdown, HTML, PDF, JSON)
3. The file will be downloaded automatically

## ⚙️ Configuration

You can edit the `CONFIG` object in `app.js`:

```javascript
const CONFIG = {
    ollamaUrl: 'http://localhost:11434',  // Ollama API address
    defaultModel: 'llama3.2',              // Default model
    maxTokens: 4096,                       // Maximum token count
    temperature: 0.7                       // Creativity level (0-1)
};
```

## 🖼️ Screenshots

### Home Screen
- Modern dark theme design
- Left sidebar navigation
- Quick start cards

### GDD Editor
- Section cards
- Auto-fill with AI
- Markdown support

### AI Chat
- Streaming responses
- Suggestion buttons
- Markdown rendering

## 🛠️ Technologies

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **AI Backend**: Ollama (Local LLM)
- **Diagrams**: Mermaid.js
- **Markdown**: Marked.js
- **Icons**: Font Awesome

## 📝 License

MIT License - Use it however you like.

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💡 Tips

- Enter a detailed game description for better results
- Try multiple models to find the best fit
- Previous conversations in chat are used as context
- Use JSON export to back up your project

---

Turn your game ideas into professional documents with **GDD Studio**! 🚀
