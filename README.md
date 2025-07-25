# Backend AI Proxy for Reva Mobile App

This is a minimal Node.js/Express backend that proxies chat requests from the Flutter app to the OpenRouter Claude 3 Sonnet model, keeping your API key secure.

## Features
- Accepts POST requests at `/api/v1/chat` with user message, history, and context.
- Forwards requests to OpenRouter's Claude 3 Sonnet model.
- Returns the AI's response in a format compatible with the Flutter app.
- Keeps your OpenRouter API key secure (never exposed to the client).

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure your OpenRouter API key:**
   - Copy `.env.example` to `.env` and fill in your OpenRouter API key.

3. **Run the server:**
   ```bash
   npm start
   ```
   The server will run on port 3001 by default.

## Deployment
You can deploy this backend to any Node.js-compatible host (Vercel, Render, Heroku, etc.).

## API
- **POST** `/api/v1/chat`
  - Request body:
    ```json
    {
      "message": "Hello, what can you do?",
      "history": [
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "Hello! How can I help you?"}
      ],
      "context_item": { "foo": "bar" }
    }
    ```
  - Response body:
    ```json
    {
      "aiResponseText": "I can help you manage tasks, expenses, and reminders. What would you like to do?",
      "actionMetadata": null,
      "contextItemId": null,
      "contextItemType": null
    }
    ```

--- #   r e v a _ a p p _ B E  
 #   r e v a _ a p p _ B E  
 #   r e v a _ a p p _ B E  
 