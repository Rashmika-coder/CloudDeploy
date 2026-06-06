# CloudDeploy: DevOps Engineer Interview Case Study

This document details the tech stack, architectural design decisions, and engineering trade-offs of the **CloudDeploy** project. It is structured from the perspective of a **Senior DevOps / Infrastructure Engineer** facing system design questions in a technical interview.

---

## 1. Architectural Overview & Design Pattern

The CloudDeploy architecture is a classic cloud-native pipeline demonstrating the progression from raw source code to an immutable, containerized deployment on public cloud infrastructure.

```mermaid
graph TD
    Developer[Developer] -- Git Push --> GH[GitHub Repository]
    subgraph GitHub Actions Pipeline (CI/CD)
        GH -- Triggers --> LintTest[Job 1: Lint & Jest Tests]
        LintTest -- Success --> BuildImg[Job 2: Build & Cache Docker Image]
        BuildImg -- Tag & Push --> Registry[Docker Hub / GHCR]
        BuildImg -- Success --> DeployJob[Job 3: SSH Deploy to EC2]
    end
    Registry -- Pulls Image --> EC2[AWS EC2 Instance]
    DeployJob -- Commands via SSH --> EC2
    subgraph AWS VPC
        EC2 -- Runs --> Container[Docker Container: Port 3000]
    end
    User([End User]) -- HTTP Port 3000 --> EC2
```

---

## 2. Deep Dive: Tech Stack Decisions & Trade-offs

Here is a breakdown of why this specific stack was chosen and what alternatives were rejected, outlining the engineering reasoning required in an interview.

| Component | Technology | Rationale | Alternatives Evaluated | Trade-off Analysis |
| :--- | :--- | :--- | :--- | :--- |
| **Infrastructure** | **AWS EC2** | Simple virtual machine host with complete control over the underlying Linux kernel, system utilities, and Docker daemon operations. Ideal for demonstrating low-level systems operations. | **AWS ECS (Fargate)** or **AWS EKS (Kubernetes)** | **Fargate** strips away VM administration, improving scaling and security, but limits OS-level visibility. **Kubernetes** is highly redundant but introduces massive configuration complexity for a single application. |
| **Provisioning (IaC)** | **Terraform** | Declarative configuration language. Offers cloud-agnostic platform architecture and maintains state tracking. | **AWS CloudFormation** or **AWS CDK** | **CloudFormation** is locked into AWS. **CDK** allows writing IaC in TypeScript/Python, which is developer-friendly, but Terraform is the industry standard for multi-cloud parity. |
| **Containerization** | **Docker** | Guarantees packaging consistency (immutable artifact). Prevents the "works on my machine" syndrome and makes migration to Kubernetes or ECS trivial. | **Bare Metal VM** (PM2 / systemd process management) | **Bare Metal** avoids container runtime overhead but risks configuration drift on the server, dependency hell, and hard-to-clean environment states. |
| **CI/CD Orchestration** | **GitHub Actions** | Integrated directly into the source control system. Excellent GitHub marketplace integrations, built-in caching APIs, and secret variables store. | **Jenkins** or **GitLab CI** | **Jenkins** is self-hosted, leading to server administration overhead, plugin maintenance, and idle compute costs. **GitHub Actions** runs on SaaS-managed infrastructure with zero management overhead. |

---

## 3. DevOps Design Decisions & Production Hardening

A key differentiator in a DevOps interview is showing that you don't just write code that works, but code that is **secure**, **performant**, and **observable**.

### A. Container Security (Zero Trust approach)
1. **Non-Root Execution**:
   > [!IMPORTANT]
   > Standard containers run as `root` by default. If an attacker exploits a remote code execution vulnerability in the Node.js application, they gain root privilege on the host system.
   Our [Dockerfile](file:///c:/Users/prane/OneDrive%20-%20Kumaraguru%20College%20of%20Technology/Desktop/antigravity%20try/app/Dockerfile#L36) explicitly sets `USER node`. The standard `node` user is a low-privileged built-in Alpine account, isolating processes.
2. **Alpine Base Image**:
   We choose `node:18-alpine` instead of a full Debian image. This reduces the image footprint from ~1GB to ~100MB, shrinking the attack surface by eliminating unnecessary system binaries (like package managers, compilers, and utilities) that could be used in custom payloads.

### B. CI/CD Speed Optimization (Caching Strategies)
- **Dependency Caching**: In our GitHub Action, we use the `actions/setup-node` caching configuration. It hashes `package-lock.json` and caches `node_modules` between runs, reducing setup times from minutes to seconds.
- **Docker Layer Caching (Buildx)**:
  ```yaml
  cache-from: type=gha
  cache-to: type=gha,mode=max
  ```
  We leverage GitHub Actions cache storage (`gha`) inside the Docker Buildx configuration. Unchanged Docker layers (such as the base image and package installs) are cached, speeding up the build cycle.

### C. Infrastructure Security (VPC & Firewalls)
- **Network Isolation**: The EC2 instance is placed inside a custom VPC with a single public subnet.
- **Least Privilege Security Groups**:
  - Outbound traffic: Open (`0.0.0.0/0`) to pull patches and Docker Hub images.
  - Ingress SSH (port 22): Ideally restricted to `allowed_ssh_cidr` (the deployer's specific IP or bastion host) instead of wide-open access.
  - Ingress Web (port 3000): Accessible to allow user traffic, but in production, this should be restricted to a Load Balancer (ALB) and not exposed directly to the open internet.

---

## 4. Interview Questions & Expected Answers (DevOps Scenarios)

### Q1: How would you achieve Zero-Downtime Deployment (Blue-Green or Canary) in this architecture?
> **Candidate Answer:**
> In our current setup, we pull the image, stop the container, and start it again. This creates ~5-10 seconds of downtime. To achieve zero-downtime:
> 1. **Reverse Proxy Setup**: Place an Nginx server or AWS Application Load Balancer (ALB) in front of the application.
> 2. **Rolling Update (Docker Compose/Blue-Green)**: Spin up the new container on a different port (e.g., 3001) while the old container is still running on port 3000.
> 3. **Health Check Validation**: Wait for the new container to return HTTP 200 on `/health`.
> 4. **Traffic Switch**: Update Nginx upstream configuration or the ALB target group to route traffic to the new port, then gracefully stop and destroy the old container.

### Q2: How do you securely handle secrets in the CI/CD pipeline and the running container?
> **Candidate Answer:**
> Under no circumstances do we check secrets (like AWS credentials, SSH keys, or API tokens) into version control.
> 1. **At Rest (GitHub)**: Secrets are injected dynamically using GitHub Actions encrypted secrets (`secrets.EC2_SSH_KEY`).
> 2. **In Transit**: The deployment script uses SSH key-pair authentication.
> 3. **Container Runtime**: Rather than hardcoding config values, we inject credentials into the container at startup using environment variables (`docker run -e DB_PASS=${{ secrets.DB_PASS }}`).
> 4. **Production Alternative**: For enterprise setups, we would transition to a dedicated secrets manager like **AWS Secrets Manager** or **HashiCorp Vault**, where the container uses AWS IAM roles to fetch credentials dynamically at startup.

### Q3: How do you handle logs and monitoring for the application once it is containerized?
> **Candidate Answer:**
> Containers are ephemeral; their storage is destroyed when the container stops. Therefore:
> 1. **Standard Output**: The application writes logs directly to `stdout`/`stderr` using console statements.
> 2. **Logging Driver**: Docker captures this stream and saves it via the JSON file driver.
> 3. **Log Aggregation**: In a production environment, we would configure a logging agent (like FluentBit or AWS CloudWatch Agent) on the host VM to forward log streams to an aggregator (like AWS CloudWatch Logs, Datadog, or Elasticsearch).
> 4. **Metrics Endpoint**: Our application exposes a `/api/metrics` endpoint. Prometheus can scrape this endpoint periodically to monitor system load, memory growth, and application availability, and send alerts through Grafana.
