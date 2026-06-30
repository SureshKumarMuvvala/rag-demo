# RAG Demo

A small full-stack demo of Retrieval-Augmented Generation (RAG). Upload PDF or TXT documents, have them chunked and indexed in Pinecone, then ask questions about their content through a chat interface powered by OpenAI.

## Architecture

- **Frontend**: React 18 + Vite (runs on `http://localhost:5173`)
- **Backend**: FastAPI + Uvicorn (runs on `http://localhost:8000`)
- **Vector store**: Pinecone
- **Embeddings & LLM**: OpenAI (`text-embedding-3-small`, `gpt-4o`)

## Prerequisites

- Python 3.10+
- Node.js 18+
- An [OpenAI](https://platform.openai.com/) API key
- A [Pinecone](https://www.pinecone.io/) API key and an index named `rag-demo` (or update `PINECONE_INDEX_NAME`)

## Project structure

```
rag-demo/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variable template
│   ├── routes/
│   │   ├── upload.py           # POST /api/upload
│   │   └── query.py            # POST /api/query
│   └── services/
│       ├── document_processor.py
│       ├── embeddings.py
│       └── pinecone_client.py
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        └── components/
            ├── FileUpload.jsx
            └── ChatWindow.jsx
```

## Configuration

1. Copy the example environment file in the backend:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` and add your keys:

   ```env
   OPENAI_API_KEY=sk-...
   PINECONE_API_KEY=...
   PINECONE_INDEX_NAME=rag-demo
   ```

3. Make sure the Pinecone index exists and uses a vector dimension matching OpenAI's `text-embedding-3-small` output (`1536` dimensions).

## Running the application

Both the backend and frontend must be running at the same time.

### 1. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

### 2. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:5173`.

## Using the app

1. Open `http://localhost:5173`.
2. Upload one or more PDF or TXT files using the sidebar.
3. Ask questions in the chat window. The app will:
   - Embed your question with `text-embedding-3-small`
   - Retrieve the top 10 most relevant chunks from Pinecone
   - Generate an answer with `gpt-4o` using the retrieved context

## API endpoints

| Method | Endpoint      | Description                              |
|--------|---------------|------------------------------------------|
| GET    | `/`           | Health check                             |
| POST   | `/api/upload` | Upload a PDF or TXT document             |
| POST   | `/api/query`  | Ask a question about uploaded documents  |

### Example: upload a document

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@example.pdf"
```

### Example: query documents

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this document about?"}'
```

## Testing

There are currently no automated test suites in the repository. To verify the application:

1. Run the backend health check:

   ```bash
   curl http://localhost:8000/
   ```

   Expected response:

   ```json
   {"status": "ok"}
   ```

2. Upload a sample document and query it with the `curl` examples above.

## Notes

- The backend is configured to accept CORS requests only from `http://localhost:5173`.
- Vite proxies `/api` requests to `http://localhost:8000` during local development, so the frontend calls appear to be same-origin.
- Uploaded chunks are batched in groups of 100 when upserting to Pinecone.
