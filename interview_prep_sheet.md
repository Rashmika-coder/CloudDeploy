# CloudDeploy: Senior DevOps Interview Cheat Sheet

Use this sheet as a study reference before your interview at **Aivar** tomorrow. It covers the core DevOps concepts, design decisions, and system architecture behind the CloudDeploy project.

---

## 1. High-Level Architecture Flow

```
[Developer Push] ➔ [GitHub Repository] ➔ [GitHub Actions Runner]
                                                   │
     ┌─────────────────────────────────────────────┴─────────────────────────────────────────────┐
     ▼ (Continuous Integration)                                                                 ▼ (Continuous Deployment)
[Run Linting & Tests] ➔ [Build & Cache Docker Image] ➔ [Push to Registry]                      [SSH Connection to EC2 VM]
                                                                                                         │
                                                                                                         ▼
                                                                                               [Pull Latest Image]
                                                                                                         │
                                                                                                         ▼
                                                                                               [Restart Container]
                                                                                                         │
                                                                                                         ▼
                                                                                               [Local Health Check]
```

---

## 2. Core DevOps Concept Explanations

### Infrastructure as Code (IaC) - Terraform
*   **What is it?** Defining virtual networks, firewalls, and server VMs in declaration configuration files rather than clicking through the AWS console web interface.
*   **Why use it?** 
    1.  **Parity & Consistency**: Ensures Staging and Production environments are exactly identical.
    2.  **Disaster Recovery**: If the entire AWS region crashes, you can redeploy the entire stack in under 5 minutes using `terraform apply`.
    3.  **Audit Trail**: Code is checked into Git, showing exactly who changed firewalls or security groups and when.

### Containerization - Docker
*   **What is it?** Wrapping the application code, its libraries, node runtime, and OS configurations into an immutable package called an image.
*   **Why use it?**
    1.  **Isolation**: Prevents dependency conflicts (e.g., if one app on the server needs Node 16 and another needs Node 18).
    2.  **Security**: Limits host access through container sandboxing.
    3.  **Portability**: The image built on your computer runs *exactly* the same on AWS EC2, AKS, or ECS without any environment modifications.

### CI/CD Pipelines - GitHub Actions
*   **What is it?** An automated software factory.
*   **Why use it?**
    1.  **Automated Quality Gates**: Automatically rejects pull requests if code fails unit tests or contains style issues.
    2.  **No Hand-offs**: Developers push code, and it builds and deploys to production automatically within minutes, eliminating manual release stages.

---

## 3. Key Technical Decisions & Interview Rationales

### Q: Why did you use a Multi-Stage Dockerfile?
*   **Answer**: In our [Dockerfile](file:///c:/Users/prane/OneDrive%20-%20Kumaraguru%20College%20of%20Technology/Desktop/antigravity%20try/app/Dockerfile), we split the build into a `builder` and a `runner` stage. 
    1.  The `builder` stage downloads development dependencies and executes tests.
    2.  The `runner` stage copies only production code and dependencies, using `node:18-alpine` as a minimal base.
    *   *Result*: The image size is reduced by ~90% (from 1GB to ~100MB), reducing pull times and saving disk space. We also eliminate dev dependency security vulnerabilities.

### Q: Explain the security considerations of your Docker configurations.
*   **Answer**: 
    1.  **Non-Root User**: We configure `USER node`. Standard containers run processes as root. If an attacker exploits an application vulnerability (like Remote Code Execution), they get root access to the underlying VM. A non-root configuration isolates access permissions.
    2.  **.dockerignore**: We explicitly ignore `node_modules`, `.git`, and test folders. This ensures sensitive configurations, local cache, or developer test scripts are never compiled into the production image.

### Q: Explain your AWS VPC and Security Group layout.
*   **Answer**: 
    1.  We created a dedicated VPC (`10.0.0.0/16`) to isolate the environment from default AWS networks.
    2.  We defined a Security Group allowing:
        *   Port `3000` (application metrics dashboard) from everywhere.
        *   Port `22` (SSH management access) restricted to designated IP addresses.
        *   Egress (outbound) open to all ports to let the server pull OS updates and retrieve the latest container images from Docker Hub.

---

## 4. Scenario-Based Questions

### Scenario 1: A developer pushes code that breaks the production server. how does your pipeline handle this?
> **Answer:**
> Our GitHub Actions pipeline contains a strict sequence. The deployment job (`deploy-to-ec2`) depends on the successful completion of the testing job (`build-and-test`). If a developer pushes code that crashes on start or fails Jest tests, the CI stage fails, the Docker image is never pushed, the SSH deploy step is bypassed, and the active production server continues running the previous stable container version without interruption.

### Scenario 2: How would you monitor the performance and health of the running application?
> **Answer:**
> 1.  **Liveness Probe**: The Express server exposes a `/health` endpoint which the CI/CD pipeline and load balancers query to ensure the app is responding.
> 2.  **Metrics Scraping**: The app exposes detailed RAM, CPU, and process metrics at `/api/metrics`. In production, we would hook up **Prometheus** to scrape this endpoint periodically, and visualize the load on a **Grafana** dashboard, setting up alerts for high memory or CPU usage.
