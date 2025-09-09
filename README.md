# DeepFunding AI Assistant

This is a Next.js application that provides an AI-powered chat assistant. The assistant is designed to answer questions about a specific knowledge base, in this case, DeepFunding, using a Retrieval-Augmented Generation (RAG) system powered by Google's Gemini models.

## Features

- **Conversational AI Chat**: A user-friendly chat interface to interact with the AI.
- **Retrieval-Augmented Generation (RAG)**: The AI's knowledge is grounded in specific data sources, providing accurate and context-aware answers.
- **Dynamic Knowledge Base**: The system automatically crawls and indexes websites to build and maintain its knowledge base.
- **REST API**: An API endpoint to allow other applications and services to query the AI.
- **Embeddable Widget**: A self-contained chat widget that can be easily embedded into any other website using an `<iframe>`.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **AI Model**: [Google Gemini](https://deepmind.google/technologies/gemini/)
- **UI**: [React](https://react.dev/), [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Web Scraping**: [Cheerio](https://cheerio.js.org/)

---

## Getting Started

Follow these steps to set up and run the project on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 1. Installation

Clone the repository and install the required dependencies:

```bash
npm install
```

### 2. Environment Variables

The application requires an API key from Google AI Studio to interact with the Gemini models.

1.  Create a new file named `.env` in the root of the project.
2.  Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).
3.  Add the key to your `.env` file like this:

    ```env
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```

**Important**: The `.env` file is included in `.gitignore` and should not be committed to your repository. For production deployments, you must set this environment variable in your hosting provider's settings.

### 3. Running the Development Server

Once the dependencies are installed and the environment variable is set, you can start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

---

## How It Works: The RAG System

The AI's intelligence is based on a Retrieval-Augmented Generation (RAG) architecture. This ensures the AI's answers are based on specific, provided documents rather than its general knowledge.

### 1. Building the Knowledge Base

When the application server starts, it automatically builds its knowledge base. This process is defined in `src/ai/retriever.ts`.

- **Crawling**: It crawls the websites defined in the `DATA_SOURCES` array. It starts from the base URL and follows links to discover up to 100 pages per domain.
- **Chunking**: The text content from each page is split into smaller, more manageable chunks.
- **Embedding**: Each chunk is converted into a numerical representation (a vector embedding) using the `text-embedding-004` model. This vector captures the semantic meaning of the text.
- **Storing**: All vector embeddings are stored in memory for fast retrieval.

### 2. Answering a Question

When a user asks a question, the following happens (defined in `src/ai/flows/ask-deepfunding-flow.ts`):

- **Embed Query**: The user's question is converted into a vector embedding.
- **Retrieve Context**: The system searches its in-memory vector store to find the text chunks with embeddings that are most similar to the question's embedding. This is the "retrieval" step.
- **Augment Prompt**: The original question is combined with the retrieved text chunks into a new, detailed prompt for the AI.
- **Generate Answer**: This "augmented prompt" is sent to the Gemini model, which generates a conversational answer based *only* on the context provided.

---

## Configuration

### Adding Data Sources

You can easily add new websites to the AI's knowledge base.

1.  Open the file `src/ai/retriever.ts`.
2.  Find the `DATA_SOURCES` constant.
3.  Add the URL of the new data source to the array.

```typescript
// src/ai/retriever.ts

const DATA_SOURCES = [
  'https://df-manual.gitbook.io/df-book',
  'https://deepfunding.ai',
  'https://community.deepfunding.ai',
  'https://your-new-source.com' // Add your new source here
];
```

The server will need to be restarted for it to crawl and index the new source.

---

## Integrations

The AI assistant is designed to be integrated into other systems easily.

### REST API

A REST API endpoint is available for programmatic access to the AI's capabilities.

- **URL**: `/api/ask`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
- **Body**: A JSON object with a `question` key.
  ```json
  {
    "question": "What is DeepFunding?"
  }
  ```

#### Example using `curl`

Replace `your-app-domain.com` with your application's actual domain.

```bash
curl -X POST https://your-app-domain.com/api/ask \
-H "Content-Type: application/json" \
-d '{"question": "What is the role of a community advisor?"}'
```

#### Example Response

```json
{
  "answer": "A Community Advisor in DeepFunding plays a crucial role in the proposal assessment process. They are responsible for reviewing proposals, providing feedback to proposers, and scoring them based on various criteria to help the community make informed funding decisions."
}
```

### Embeddable Web Widget

You can embed the full AI chat interface directly into any other website using an `<iframe>`.

1.  A dedicated page at `/embed` serves the chat widget without any other UI elements.
2.  Add the following HTML snippet to the target website where you want the widget to appear.

```html
<iframe
  src="https://your-app-domain.com/embed"
  width="450"
  height="600"
  frameborder="0"
  style="border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
  title="DeepFunding AI Assistant"
></iframe>
```

You can customize the `width`, `height`, and `style` attributes to match the look and feel of the host website.
