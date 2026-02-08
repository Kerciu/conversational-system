# Decisio.ai | Conversational System 🧑‍💻🗨️🔮

[![Contributors](https://img.shields.io/github/contributors/Kerciu/conversational-system?color=red)](https://github.com/Kerciu/conversational-system/graphs/contributors)
[![Commit Activity](https://img.shields.io/badge/Commits-📈%20View%20Graph-orange)](https://github.com/Kerciu/conversational-system/graphs/commit-activity)
[![Repo Size](https://img.shields.io/github/repo-size/Kerciu/conversational-system?color=yellow)](https://github.com/Kerciu/conversational-system)
[![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-~2.5k-green?logo=git)](https://github.com/Kerciu/conversational-system)
[![License](https://img.shields.io/github/license/Kerciu/conversational-system?color=blue)](LICENSE)

**Turn business problem descriptions into working optimization models in just one conversation!** 🪄


This project builds a smart system that takes a text description of a linear problem and extra documents (using RAG) to automatically create a mathematical model and runnable Python code. It runs the code, shows visualizations of the results, and lets users ask questions for interactive analysis. Users can also request changes at any stage of the process.

## 🎥 Live Demo

### 1. Registration, Login & Account Verification
https://github.com/user-attachments/assets/f370e988-7ab6-43da-9ece-f2560fe14d29


### 2. Problem Description → Model → Visualization + Download
https://github.com/user-attachments/assets/680845dd-1ca8-49ea-bd14-804f434b8494

## ⚙️ Core Functionalities 

- **Interactive Modeling**: Translates natural language into formal math models with professional rendering and chat-based refinement.
- **Context-Aware RAG**: Automatically extracts business constraints and numerical data from uploaded PDFs and text files.
- **Automated Solving**: Generates, executes, and self-corrects Python scripts to solve linear optimization problems.
- **Secure Sandbox**: Runs AI-generated code in an isolated Docker environment with no network access and strict resource limits.
- **Reporting & Visualization**: Delivers plain-English insights, automated charts, and downloadable PDF summaries.
- **Identity & Security**: Secure access via JWT/OAuth2 (Google/GitHub) with email activation and strict data isolation.

## 🔧 Tech Stack
[![My Skills](https://skillicons.dev/icons?i=java,spring,python,nextjs,postgresql,redis,rabbitmq,docker,git,githubactions)](https://skillicons.dev)

#### Backend
- Java + Spring Boot
- Python (Langchain, Pulp)
#### Frontend
- Next.js
#### Database & Queue
- PostgreSQL
- Redis
- RabbitMQ
#### DevOps
- Docker
- Git + GitHub Actions

## 🏗️ Architecture
### Central Backend 
The Java Spring Boot service runs the main logic of the app. It manages user accounts through **JWT** and **OAuth2** (Google/GitHub) for secure login. It saves all data to a **PostgreSQL** database and uses an **SMTP** server to send emails for account verification and password resets.

### AI Agents 
This Python **microservice** uses **LangChain** to run specialized AI agents (Modeler, Coder, Visualizer). It uses **ChromaDB** as a vector database for **RAG** (Retrieval-Augmented Generation), which lets agents search through uploaded PDFs and text files. To solve optimization problems, the agents use **PuLP** with the **CBC solver** (Coin-or branch and cut) to calculate result.

### Secure Code Sandbox
All AI-generated code runs in a specialized, fully isolated sandbox. It uses a **Docker-in-Docker** approach (via Docker SDK) to launch a new, short-lived container for every script execution. To ensure system security and stability:
- **Network Isolation**: Containers use `network_mode: none`, meaning they have **no internet access** and cannot reach other services in the system.
- **Resource Limits**: Strict limits are placed on **memory (RAM)**, number of **processes (PIDs)**, and total **execution time** to prevent resource exhaustion or malicious loops.
- **Artifact Management**: The service automatically captures `stdout/stderr` and collects generated files (like **Matplotlib** plots) from the container using tar-stream extraction, converting them to Base64 for the frontend.
- **Clean Slate**: Each container is forcibly removed immediately after execution, leaving no persistent state or files behind.

### Communication and Speed
The system uses **RabbitMQ** to handle long AI tasks in the background. This keeps the website fast because it doesn't have to wait for the AI to finish. **Redis** is used to store temporary data like current job progress status (*'ok', 'pending', 'failed'*) and login security codes.

### CI/CD and Quality
The project uses **GitHub Actions** (config in .github/workflows/build.yaml) to automate the build and deployment process. Every change triggers tests for backend (**Spring Boot + Maven**), frontend (**Next.js + ESLint**), and Python services (**agent/sandbox with Ruff + pytest**). We also set up **Postgres** containers for integration tests and build **Docker** images at the end to ensure clean, consistent code quality across the repository.

## 🚀 Installation & Execution
Prerequisites:
- Docker Engine
- Docker Compose

Start by cloning the repository:
```bash 
    git clone https://github.com/Kerciu/conversational-system.git
    cd conversational-system
```

Take a look at `.env.example` and create `.env` file in the root directory with your API keys.
```bash
    cp .env.example .env
    # Edit .env with your API keys (OpenAI, SMTP, etc.)
```

Start the application by running:
```bash
    docker compose up --build
```
Finally, go to http://localhost:3000. <br/><br/>
Stop and clean:
```bash
    docker compose down -v  # removes volumes
```
