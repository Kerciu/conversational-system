# 🧑‍💻🗨️🔮 Decisio.ai | Conversational System 
This project builds a smart system that takes a text description of a linear problem and extra documents (using RAG) to automatically create a mathematical model and runnable Python code. It runs the code, shows visualizations of the results, and lets users ask questions for interactive analysis. and lets users ask questions for interactive analysis. Users can also request changes at any stage.
## ⚙️ Core Functionalities 

## 🎥 Project Demo

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
The Java Spring Boot service runs the main logic of the app. It manages user accounts through **JWT** and **OAuth2** (Google/GitHub) for secure login. It saves all data to a PostgreSQL database and uses an **SMTP** server to send emails for account verification and password resets.

### AI Agents 
This Python **microservice** uses **LangChain** to run specialized AI agents (Modeler, Coder, Visualizer). It uses **ChromaDB** as a vector database for **RAG** (Retrieval-Augmented Generation), which lets agents search through uploaded PDFs and text files. To solve optimization problems, the agents use **PuLP** with the **CBC solver** (Coin-or branch and cut) to calculate result.

### Secure Code Sandbox
All AI-generated code runs in a specialized sandbox to keep the system safe. It uses a **Docker-in-Docker** setup where each script executes in its own temporary container. For security, these containers have no internet access and no connection to the rest of the internal network. This prevents the AI-generated code from making external requests or attacking the main system.

### Communication and Speed
The system uses **RabbitMQ** to handle long AI tasks in the background. This keeps the website fast because it doesn't have to wait for the AI to finish. **Redis** is used to store temporary data like current job progress and login security codes.

### CI/CD and Quality
The project uses **GitHub Actions** (config in .github/workflows/build.yaml) to automate the build and deployment process. Every change triggers tests for backend (**Spring Boot + Maven**), frontend (**Next.js + ESLint**), and Python services (**agent/sandbox with Ruff + pytest**). We also spin up Postgres containers for integration tests and build **Docker** images at the end to ensure clean, consistent code quality across the repository.

## 🚀 Installation & Execution
Prerequisites:
- Docker Engine
- Docker Compose

First download the repository:
```bash 
    git clone https://github.com/Kerciu/conversational-system.git
    cd conversational-system
```
Take a look at `.env.example` and create `.env` file in the root directory with your API keys.
You can start the application by running:
```bash
    docker compose up --build
```
