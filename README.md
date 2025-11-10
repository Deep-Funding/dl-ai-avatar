# DeepFunding AI Assistant

This is a Next.js application that provides an AI-powered chat assistant. The assistant is designed to answer questions about a specific knowledge base, in this case, DeepFunding, using a Retrieval-Augmented Generation (RAG) system powered by Google's Gemini models and a persistent vector store in Firestore.

## Features

- **Conversational AI Chat**: A user-friendly chat interface to interact with the AI.
- **Retrieval-Augmented Generation (RAG)**: The AI's knowledge is grounded in specific data sources, providing accurate and context-aware answers.
- **Persistent Knowledge Base**: The system connects to a Firestore database where a knowledge base has been stored as vector embeddings by a separate backend process.
- **REST API**: An API endpoint to allow other applications and services to query the AI.
- **Embeddable Widget**: A self-contained chat widget that can be easily embedded into any other website using an `<iframe>`.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **AI Model**: [Google Gemini](https://deepmind.google/technologies/gemini/)
- **Database**: [Firestore](https://firebase.google.com/docs/firestore) for the vector store.
- **UI**: [React](https://react.dev/), [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)

---

## Getting Started

Follow these steps to set up and run the project on your local machine. Your Firestore database should already be populated by your separate backend service.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A [Firebase Project](https://console.firebase.google.com/) with Firestore enabled.

### 1. Installation

Clone the repository and install the required dependencies:

```bash
npm install
```

### 2. Environment Variables

The application requires credentials for both the Gemini API and Firebase.

1.  Create a new file named `.env` in the root of the project.
2.  **Gemini API Key**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey) and add it to your `.env` file:
    ```env
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```
3.  **Firebase Service Account**:
    *   In your Firebase project settings, go to the "Service accounts" tab.
    *   Click "Generate new private key" to download a JSON file.
    *   Copy the **entire contents** of that JSON file into your `.env` file as the value for `FIREBASE_SERVICE_ACCOUNT`.
    *   Add your Firebase Project ID as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.

    Your `.env` file should look like this:
    ```env
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
    FIREBASE_SERVICE_ACCOUNT={"type": "service_account", "project_id": "...", ...}
    ```

**Important**: The `.env` file is included in `.gitignore` and should not be committed to your repository. For production deployments, you must set these environment variables in your hosting provider's settings.

### 3. Running the Development Server

Once the dependencies are installed and the environment variables are set, you can start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

---

## How It Works: The RAG System with Firestore

The AI's intelligence is based on a Retrieval-Augmented Generation (RAG) architecture. This ensures the AI's answers are based on specific, provided documents rather than its general knowledge. The knowledge base itself is built and maintained by a separate backend process.

### Answering a Question

When a user asks a question, the following happens (defined in `src/ai/flows/ask-deepfunding-flow.ts`):

- **Embed Query**: The user's question is converted into a vector embedding.
- **Retrieve Context**: The system queries the `vector_chunks` collection in Firestore to find the text chunks with embeddings that are most similar to the question's embedding. This is the "retrieval" step.
- **Augment Prompt**: The original question is combined with the retrieved text chunks into a new, detailed prompt for the AI.
- **Generate Answer**: This "augmented prompt" is sent to the Gemini model, which generates a conversational answer based *only* on the context provided.

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
