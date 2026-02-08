# 🧑‍💻🗨️🔮 Decisio.ai | Conversational System 
This project builds a smart system that takes a text description of a linear problem and extra documents (using RAG) to automatically create a mathematical model and runnable Python code. It runs the code, shows visualizations of the results, and lets users ask questions for interactive analysis. and lets users ask questions for interactive analysis. Users can also request changes at any stage.

## ⚙️ Core Functionalities 

### Problem Modeling
- **Natural Language Translation**: Translates business descriptions into formal math (variables, objective functions, constraints).
- **Mathematical Rendering**: Displays models using professional notation for easy verification and review.
- **Chat-Based Refinement**: Allows users to adjust the model or add new constraints through conversation.

### Knowledge Extraction
- **Information Retrieval**: Extracts specific data and limits from uploaded documents like PDFs or text files.
- **Data Identification**: Automatically identifies numerical values and logical rules within documents to create the model.

### Solving and Execution
- **Code Generation**: Writes complete computer scripts required to solve the linear optimization problem.
- **Isolated Execution**: Runs scripts in a secure, isolated sandbox (with no network access and strict resource limits).
- **Error Correction**: Detects and fixes script errors by automatically analyzing execution logs and tracebacks.

### Analysis and Reporting
- **Automated Plotting**: Generates charts and graphs based on solver data to show trends and distributions.
- **Natural Language Analysis**: Summarizes results and explains the logic behind the calculated numbers.
- **Document Export**: Generates reports with results, models, and charts.

### User Management and Security
- **Authentication**: Secure login via JWT and social providers (Google/GitHub).
- **Verification & Recovery**: Email-based account activation and password resets.
- **Data Privacy**: Strict isolation to ensure users only access their own files and results.

## 🎥 Project Demo
#### Login & registration
#### Create new problem
#### Upload documents
#### Chat with AI agents
#### View and download results
#### Account management

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
