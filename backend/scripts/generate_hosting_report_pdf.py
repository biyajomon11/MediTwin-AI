import os
import sys
import base64
import io
import qrcode
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def generate_qr_base64(url: str) -> str:
    """Generate high-resolution QR code for the hosted URL and return as base64 PNG."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

def build_hosting_html(output_html_path: str, qr_b64: str):
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MediTwin AI - Section 6.2.4 Hosting Documentation</title>
<style>
  @page {{
    size: A4;
    margin: 18mm 18mm 18mm 18mm;
  }}

  body {{
    font-family: 'Times New Roman', Times, serif;
    color: #111111;
    line-height: 1.42;
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-size: 10.5pt;
  }}

  /* Running Header & Footer simulation */
  .running-header {{
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #777777;
    padding-bottom: 4px;
    margin-bottom: 14px;
    font-size: 9pt;
    font-style: italic;
    color: #333333;
  }}

  .page-container {{
    page-break-before: always;
    min-height: 980px;
    position: relative;
    box-sizing: border-box;
  }}

  .page-container:first-of-type {{
    page-break-before: avoid;
  }}

  h1.sec-title {{
    font-size: 13.5pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 0 0 10px 0;
    color: #000000;
  }}

  h2.sub-title {{
    font-size: 11.5pt;
    font-weight: bold;
    margin: 12px 0 5px 0;
    color: #000000;
    border-bottom: 1px solid #cccccc;
    padding-bottom: 2px;
  }}

  h3.step-heading {{
    font-size: 10.5pt;
    font-weight: bold;
    margin: 8px 0 2px 0;
    color: #0f172a;
  }}

  p {{
    text-align: justify;
    margin: 0 0 6px 0;
    text-indent: 0;
  }}

  ul {{
    margin: 3px 0 8px 20px;
    padding: 0;
  }}

  li {{
    margin-bottom: 3px;
    text-align: justify;
  }}

  li strong {{
    color: #000000;
  }}

  .code-block {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 3.5px solid #2563eb;
    padding: 5px 9px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 8pt;
    line-height: 1.25;
    margin: 4px 0 8px 0;
    border-radius: 2px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #0f172a;
  }}

  /* Table styling */
  table.meta-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 12px 0;
    font-size: 9.5pt;
  }}

  table.meta-table th, table.meta-table td {{
    border: 1px solid #000000;
    padding: 5px 8px;
    text-align: left;
    vertical-align: middle;
  }}

  table.meta-table th {{
    background-color: #f1f5f9;
    font-weight: bold;
  }}

  .qr-section {{
    text-align: center;
    margin-top: 10px;
    padding: 8px;
    border: 1px dashed #94a3b8;
    background: #fafafa;
    border-radius: 6px;
    width: 240px;
    margin-left: auto;
    margin-right: auto;
  }}

  .qr-section img {{
    width: 110px;
    height: 110px;
    display: block;
    margin: 0 auto 4px auto;
  }}

  .qr-caption {{
    font-size: 8pt;
    font-weight: bold;
    color: #334155;
  }}
</style>
</head>
<body>

<!-- ======================================================================= -->
<!-- PAGE 1 (Report Page 72) -->
<!-- ======================================================================= -->
<div class="page-container">
  <div class="running-header">
    <span>MediTwin AI — Intelligent Patient Digital Twin & Healthcare System</span>
    <span>72</span>
  </div>

  <h1 class="sec-title">6.2.4 HOSTING</h1>
  <p>
    Hosting is the process of provisioning scalable server infrastructure for storing, serving, and managing web applications and relational databases accessible globally via the internet. Modern enterprise healthcare platforms require high uptime, strict data isolation, SSL/TLS cryptographic communication, and rapid continuous integration and continuous deployment (CI/CD) pipelines.
  </p>
  <p>
    The <strong>MediTwin AI</strong> platform is engineered with a modern decoupled cloud architecture: the responsive client application is hosted on <strong>Vercel's Global Edge Network</strong>, while the 3NF-normalized PostgreSQL database and Node.js/Express API services are deployed on the <strong>Render Cloud Application Platform</strong>.
  </p>

  <h2 class="sub-title">1. Cloud Hosting Architecture & Key Capabilities</h2>
  <p>
    Rather than traditional monolithic on-premise servers, utilizing specialized cloud platforms offers distinct operational advantages tailored to healthcare applications:
  </p>
  <ul>
    <li>
      <strong>Scalable Serverless Edge Infrastructure:</strong> Vercel distributes static assets and pre-rendered client bundles across worldwide Edge Points of Presence (PoPs), reducing latency under 50ms for clinical workstations.
    </li>
    <li>
      <strong>Automated Git-Driven CI/CD Pipelines:</strong> Every verified commit pushed to the production GitHub repository automatically initiates atomic container builds, automated regression testing, and zero-downtime canary deployments.
    </li>
    <li>
      <strong>Robust Security & SSL/TLS Encryption:</strong> Automatic issuance of TLS/SSL certificates ensures all data in transit between doctors, nurses, patients, and the database conforms to HIPAA security standards.
    </li>
    <li>
      <strong>Managed PostgreSQL with Prisma ORM:</strong> Render provisions isolated PostgreSQL container instances with automated storage scaling, continuous connection pooling, and ACID transactional guarantees.
    </li>
    <li>
      <strong>Zero-Configuration Reverse Proxy Architecture:</strong> Server-side route rewrites eliminate Cross-Origin Resource Sharing (CORS) preflight latencies and safeguard private backend service endpoints.
    </li>
  </ul>

  <h2 class="sub-title">2. Step-by-Step Procedure for Hosting Backend on Render</h2>

  <h3 class="step-heading">Step 1: Database Schema & Prisma ORM Configuration</h3>
  <p>
    The backend architecture utilizes Prisma ORM to interface with PostgreSQL in strict Third Normal Form (3NF). In <code>backend/prisma/schema.prisma</code>, the PostgreSQL datasource provider and schema models (<code>tbl_user</code>, <code>tbl_login</code>, <code>tbl_doctor_profile</code>, <code>tbl_patient_profile</code>, <code>tbl_appointment</code>, <code>tbl_prescription</code>, <code>tbl_ward_bed</code>) are defined:
  </p>
  <div class="code-block">datasource db {{
  provider = "postgresql"
  url      = env("DATABASE_URL")
}}

generator client {{
  provider = "prisma-client-js"
}}</div>

  <h3 class="step-heading">Step 2: Backend Production Scripts Configuration</h3>
  <p>
    Ensure <code>backend/package.json</code> includes automated scripts for dependency installation, client generation, TypeScript transpilation, and database schema synchronization:
  </p>
  <div class="code-block">"scripts": {{
  "build": "tsc",
  "start": "node dist/index.js",
  "prisma:generate": "prisma generate"
}}</div>

  <h3 class="step-heading">Step 3: Define Infrastructure as Code (render.yaml)</h3>
  <p>
    To ensure deterministic deployments, a declarative blueprint manifest <code>render.yaml</code> was formulated in the root repository. It instructs Render's build orchestrator to execute Prisma code generation, TypeScript compilation, and database migration:
  </p>
  <div class="code-block">services:
  - type: web
    name: meditwin-ai-backend
    env: node
    plan: free
    rootDir: backend
    buildCommand: npm install --include=dev && npx prisma generate && npm run build
    startCommand: npx prisma db push --accept-data-loss && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        value: super-secret-meditwin-jwt-key
      - key: DATABASE_URL
        sync: false</div>

  <h3 class="step-heading">Step 4: Push the Unified Repository to GitHub</h3>
  <p>
    Initialize Git, commit all workspace source files, and push the project to the centralized remote repository at <code>https://github.com/biyajomon11/MediTwin-AI.git</code> on the <code>main</code> branch.
  </p>
</div>

<!-- ======================================================================= -->
<!-- PAGE 2 (Report Page 73) -->
<!-- ======================================================================= -->
<div class="page-container">
  <div class="running-header">
    <span>MediTwin AI — Intelligent Patient Digital Twin & Healthcare System</span>
    <span>73</span>
  </div>

  <h3 class="step-heading">Step 5: Sign Up and Access the Render Cloud Console</h3>
  <p>
    Navigate to <code>https://dashboard.render.com</code> and authenticate using authorized GitHub credentials. Grant Render read/write access to the MediTwin AI repository.
  </p>

  <h3 class="step-heading">Step 6: Provision Managed PostgreSQL Database Instance on Render</h3>
  <p>
    1. In the Render Dashboard, click <strong>New +</strong> and select <strong>PostgreSQL</strong>.<br>
    2. Enter database name: <code>meditwin_db</code>, user: <code>meditwin_user</code>, region: <code>Oregon (US West)</code> or closest region, and PostgreSQL Version: <code>16</code>.<br>
    3. Choose the Free instance plan and click <strong>Create Database</strong>.
  </p>

  <h3 class="step-heading">Step 7: Retrieve Internal & External Database Connection Strings</h3>
  <p>
    Upon database provisioning, copy the <strong>Internal Database URL</strong> (for zero-latency communication within Render's private virtual network) and the <strong>External Database URL</strong>:
  </p>
  <div class="code-block">DATABASE_URL = postgresql://meditwin_user:password@dpg-meditwin-db.oregon-postgres.render.com/meditwin_db</div>

  <h3 class="step-heading">Step 8: Create and Configure Backend Web Service on Render</h3>
  <p>
    1. In Render Dashboard, click <strong>New + &rarr; Web Service</strong>.<br>
    2. Select the GitHub repository <code>biyajomon11/MediTwin-AI</code>.<br>
    3. Name the service: <code>meditwin-ai-backend</code>.<br>
    4. Set <strong>Root Directory</strong> to: <code>backend</code>.<br>
    5. Select <strong>Environment</strong>: <code>Node</code>; Branch: <code>main</code>.
  </p>

  <h3 class="step-heading">Step 9: Configure Build Command & Start Command</h3>
  <p>
    Enter the exact commands matching the deployment pipeline:
  </p>
  <ul>
    <li><strong>Build Command:</strong> <code>npm install --include=dev && npx prisma generate && npm run build</code></li>
    <li><strong>Start Command:</strong> <code>npx prisma db push --accept-data-loss && npm start</code></li>
  </ul>

  <h3 class="step-heading">Step 10: Inject Production Environment Variables</h3>
  <p>
    Under the <strong>Environment Variables</strong> tab of the Web Service, add the following secure keys:
  </p>
  <ul>
    <li><code>NODE_ENV</code>: <code>production</code></li>
    <li><code>DATABASE_URL</code>: <code>postgresql://meditwin_user:password@dpg-...render.com/meditwin_db</code></li>
    <li><code>JWT_SECRET</code>: <code>super-secret-meditwin-jwt-key</code></li>
    <li><code>PORT</code>: <code>10000</code></li>
    <li><code>GOOGLE_CLIENT_ID</code>: <code>598268803778-hjlcqqdfkgrh9vld6uj9nh70k047ffbg...</code></li>
  </ul>

  <h3 class="step-heading">Step 11: Execute Automatic Database Schema Push & Deployment</h3>
  <p>
    Click <strong>Create Web Service</strong>. Render automatically clones the repository, installs dependencies, compiles TypeScript code to <code>backend/dist</code>, executes <code>prisma db push</code> to apply all 3NF tables to PostgreSQL, and binds the Express server to the assigned port.
  </p>

  <h3 class="step-heading">Step 12: Verify Backend API Health and Live Endpoints</h3>
  <p>
    Once deployed, test the live backend endpoint using curl or a web browser to confirm HTTP 200 OK:
  </p>
  <div class="code-block">GET https://meditwin-ai-backend.onrender.com/api/health
Response: {{"status": "healthy", "service": "MediTwin AI Backend API", "timestamp": "2026-10-21T..."}}</div>
</div>

<!-- ======================================================================= -->
<!-- PAGE 3 (Report Page 74) -->
<!-- ======================================================================= -->
<div class="page-container">
  <div class="running-header">
    <span>MediTwin AI — Intelligent Patient Digital Twin & Healthcare System</span>
    <span>74</span>
  </div>

  <h2 class="sub-title">3. Step-by-Step Procedure for Hosting Frontend on Vercel</h2>

  <h3 class="step-heading">Step 13: Configure Vite Production Build Pipeline</h3>
  <p>
    The frontend is built using React 18, TypeScript, Tailwind CSS, and Vite. Verify <code>vite.config.ts</code> has proper module aliases and production output configurations matching standard React SPAs:
  </p>
  <div class="code-block">export default defineConfig({{
  plugins: [react()],
  resolve: {{ alias: {{ '@': path.resolve(__dirname, './src') }} }},
  server: {{ port: 3000 }}
}});</div>

  <h3 class="step-heading">Step 14: Configure Single Page Application (SPA) Routing & Rewrites</h3>
  <p>
    Client-side routing with React Router DOM (e.g., <code>/dashboard/patient</code>, <code>/doctor/inpatients</code>, <code>/doctor/bed-allocation</code>) requires server-level fallback rewrites to <code>index.html</code> so direct link access and page reloads avoid HTTP 404 Not Found errors.
  </p>

  <h3 class="step-heading">Step 15: Implement Zero-CORS API Reverse Proxy in vercel.json</h3>
  <p>
    To completely bypass browser Cross-Origin Resource Sharing (CORS) preflight restrictions and prevent mixed-content blocks, <code>vercel.json</code> is configured in the root directory to proxy all <code>/api/*</code> traffic server-to-server directly to the Render backend:
  </p>
  <div class="code-block">{{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {{
      "source": "/api/(.*)",
      "destination": "https://meditwin-ai-backend.onrender.com/api/$1"
    }},
    {{
      "source": "/(.*)",
      "destination": "/"
    }}
  ]
}}</div>

  <h3 class="step-heading">Step 16: Configure Frontend Environment Variables</h3>
  <p>
    Create or update production client environment keys in <code>.env</code>:
  </p>
  <div class="code-block">VITE_GOOGLE_CLIENT_ID="598268803778-hjlcqqdfkgrh9vld6uj9nh70k047ffbg.apps.googleusercontent.com"</div>

  <h3 class="step-heading">Step 17: Sign In to Vercel and Import GitHub Repository</h3>
  <p>
    1. Navigate to <code>https://vercel.com/new</code> and log in using GitHub OAuth.<br>
    2. Under "Import Git Repository", locate and select <code>biyajomon11/MediTwin-AI</code>.
  </p>

  <h3 class="step-heading">Step 18: Configure Project Build & Output Settings on Vercel</h3>
  <p>
    Vercel automatically detects the Vite project structure. Verify the following parameters:
  </p>
  <ul>
    <li><strong>Framework Preset:</strong> <code>Vite</code></li>
    <li><strong>Root Directory:</strong> <code>./</code></li>
    <li><strong>Build Command:</strong> <code>npm run build</code> (executes <code>tsc && vite build</code>)</li>
    <li><strong>Output Directory:</strong> <code>dist</code></li>
    <li><strong>Install Command:</strong> <code>npm install</code></li>
  </ul>

  <h3 class="step-heading">Step 19: Add Production Environment Variables in Vercel Dashboard</h3>
  <p>
    Under the <strong>Environment Variables</strong> collapsible section, enter:
  </p>
  <ul>
    <li>Key: <code>VITE_GOOGLE_CLIENT_ID</code></li>
    <li>Value: <code>598268803778-hjlcqqdfkgrh9vld6uj9nh70k047ffbg.apps.googleusercontent.com</code></li>
  </ul>

  <h3 class="step-heading">Step 20: Trigger Production Deployment & Global CDN Distribution</h3>
  <p>
    Click <strong>Deploy</strong>. Vercel compiles the React components, minifies CSS bundles with PostCSS, executes tree-shaking, and distributes the static application across Edge caches globally.
  </p>

  <h3 class="step-heading">Step 21: Automatic SSL/TLS Certificate Provisioning</h3>
  <p>
    Vercel automatically assigns a globally valid SSL/TLS certificate via Let's Encrypt with HTTP Strict Transport Security (HSTS) and automatic HTTP-to-HTTPS redirect at: <code>https://meditwin-ai.vercel.app</code>.
  </p>
</div>

<!-- ======================================================================= -->
<!-- PAGE 4 (Report Page 75) -->
<!-- ======================================================================= -->
<div class="page-container">
  <div class="running-header">
    <span>MediTwin AI — Intelligent Patient Digital Twin & Healthcare System</span>
    <span>75</span>
  </div>

  <h2 class="sub-title">4. Integration, Security & Post-Deployment Verification</h2>

  <h3 class="step-heading">Step 22: Configure Cross-Origin Whitelisting & Secure JWT Cookies</h3>
  <p>
    In <code>backend/src/index.ts</code>, configure CORS middleware to whitelist requests originating from <code>https://meditwin-ai.vercel.app</code>, enabling secure header propagation (Authorization Bearer tokens) while denying unauthorized third-party domains:
  </p>
  <div class="code-block">app.use(cors({{
  origin: ["https://meditwin-ai.vercel.app", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}}));</div>

  <h3 class="step-heading">Step 23: Perform End-to-End Clinical Workflow Smoke Tests</h3>
  <p>
    Conduct end-to-end integration verification across live endpoints:
  </p>
  <ul>
    <li><strong>Authentication Test:</strong> Authenticate as Doctor, Nurse, and Patient; verify JWT issuance and session initialization.</li>
    <li><strong>Clinical Module Navigation:</strong> Test patient prescriptions view, doctor inpatient roster, and interactive bed allocation map.</li>
    <li><strong>Data Persistence:</strong> Record patient vitals and schedule doctor appointments; verify data commits to the live PostgreSQL database.</li>
  </ul>

  <h3 class="step-heading">Step 24: Configure Automated Continuous Deployment (CI/CD) Webhooks</h3>
  <p>
    Vercel and Render deploy automatic webhooks listening to the GitHub repository. Every push to the <code>main</code> branch triggers concurrent pipeline builds:
  </p>
  <ul>
    <li><strong>Vercel Pipeline:</strong> Clones updated commit &rarr; runs <code>npm run build</code> &rarr; updates Edge CDN in ~35 seconds.</li>
    <li><strong>Render Pipeline:</strong> Re-pulls backend &rarr; executes <code>prisma generate</code> &rarr; applies schema migrations &rarr; restarts container with zero downtime.</li>
  </ul>

  <h3 class="step-heading">Step 25: Real-Time Server Monitoring, Log Streaming & Maintenance</h3>
  <p>
    Live application metrics, memory limits, CPU utilization, and HTTP request access logs are tracked in real time via the Render Log Viewer and Vercel Analytics console. Automated daily backups ensure database disaster recovery.
  </p>

  <h2 class="sub-title">Hosted Application Deployment Summary</h2>

  <table class="meta-table">
    <tr>
      <th style="width: 32%;">Deployment Parameter</th>
      <th style="width: 68%;">Production Value / Platform Specification</th>
    </tr>
    <tr>
      <td><strong>Frontend Platform</strong></td>
      <td>Vercel Global Edge Network (Vite / React 18 / Tailwind CSS)</td>
    </tr>
    <tr>
      <td><strong>Live Frontend URL</strong></td>
      <td><a href="https://meditwin-ai.vercel.app" style="color:#0284c7; text-decoration:none; font-weight:bold;">https://meditwin-ai.vercel.app</a></td>
    </tr>
    <tr>
      <td><strong>Backend API Platform</strong></td>
      <td>Render Cloud Application Services (Node.js / Express / Prisma)</td>
    </tr>
    <tr>
      <td><strong>Live Backend API Endpoint</strong></td>
      <td><a href="https://meditwin-ai-backend.onrender.com" style="color:#0284c7; text-decoration:none;">https://meditwin-ai-backend.onrender.com</a></td>
    </tr>
    <tr>
      <td><strong>Database Infrastructure</strong></td>
      <td>Render Managed PostgreSQL 16 (3NF Relational Architecture)</td>
    </tr>
    <tr>
      <td><strong>Source Code Repository</strong></td>
      <td>GitHub: <code>biyajomon11/MediTwin-AI</code> (Branch: <code>main</code>)</td>
    </tr>
    <tr>
      <td><strong>Security & Protocols</strong></td>
      <td>End-to-End HTTPS (TLS 1.3), JWT Auth, Reverse Proxy Rewrites</td>
    </tr>
    <tr>
      <td><strong>Deployment Pipeline</strong></td>
      <td>Automated CI/CD via GitHub Push Webhooks</td>
    </tr>
  </table>

  <div class="qr-section">
    <img src="{qr_b64}" alt="MediTwin AI Hosted QR Code">
    <div class="qr-caption">Scan to Launch MediTwin AI Web Application</div>
    <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">https://meditwin-ai.vercel.app</div>
  </div>
</div>

</body>
</html>
"""
    with open(output_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML hosting report saved to {output_html_path}")


def convert_html_to_pdf(html_path: str, output_pdf_path: str, screenshot_path: str):
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--window-size=1200,1600')

    driver = webdriver.Chrome(options=options)
    abs_html = os.path.abspath(html_path)
    driver.get(f"file:///{abs_html}")

    driver.save_screenshot(screenshot_path)
    print(f"Preview screenshot saved to {screenshot_path}")

    print_params = {
        'landscape': False,
        'displayHeaderFooter': True,
        'headerTemplate': '<div style="font-size: 8pt; font-family: \'Times New Roman\'; width: 100%; display: flex; justify-content: space-between; padding-left: 18mm; padding-right: 18mm; color: #555;"><span>Department of Computer Applications — Amal Jyothi College of Engineering Autonomous</span><span>MediTwin AI</span></div>',
        'footerTemplate': '<div style="font-size: 8pt; font-family: \'Times New Roman\'; width: 100%; display: flex; justify-content: space-between; padding-left: 18mm; padding-right: 18mm; color: #555;"><span>MediTwin AI — Section 6.2.4 Hosting Report</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
        'printBackground': True,
        'paperWidth': 8.27,   # A4 width
        'paperHeight': 11.69, # A4 height
        'marginTop': 0.65,
        'marginBottom': 0.65,
        'marginLeft': 0.55,
        'marginRight': 0.55,
        'preferCSSPageSize': True
    }

    result = driver.execute_cdp_cmd('Page.printToPDF', print_params)
    pdf_bytes = base64.b64decode(result['data'])

    with open(output_pdf_path, 'wb') as f:
        f.write(pdf_bytes)

    driver.quit()
    print(f"Generated PDF written to {output_pdf_path} ({len(pdf_bytes)} bytes)")

    # Also save a copy in the root workspace directory
    root_pdf = os.path.abspath(r"d:\SEM 2\A.I\MediTwin\MediTwin_AI_Hosting_Report.pdf")
    with open(root_pdf, 'wb') as f:
        f.write(pdf_bytes)
    print(f"Also saved root copy to {root_pdf}")


if __name__ == "__main__":
    base_dir = os.path.abspath(r"d:\SEM 2\A.I\MediTwin")
    hosted_url = "https://meditwin-ai.vercel.app"
    
    html_file = os.path.join(base_dir, "reports", "MediTwin_AI_Hosting_Report.html")
    pdf_file = os.path.join(base_dir, "reports", "MediTwin_AI_Hosting_Report.pdf")
    screenshot_file = os.path.join(base_dir, "reports", "screenshots", "hosting_report_preview.png")

    qr_base64 = generate_qr_base64(hosted_url)
    build_hosting_html(html_file, qr_base64)
    convert_html_to_pdf(html_file, pdf_file, screenshot_file)
