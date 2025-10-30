[English](./README.md) | [繁體中文](./README.zh-TW.md)

# 🪶 aws-log-reviewer

`aws-log-reviewer` 是一個用於 **在本地環境中預覽 AWS CloudWatch Logs** 的工具。  
透過 `awslocal logs filter-log-events` 指令從 LocalStack 抓取所有日誌，並將結果匯出後顯示在網頁 UI 上，方便開發者快速檢視 Lambda 或其他 AWS 服務的執行日誌。

---

## 🚀 功能特色

- 🧾 一鍵擷取 LocalStack 中的 CloudWatch Logs  
- 📂 支援將 log 匯出成 JSON 檔案  
- 💻 直覺式網頁 UI，快速瀏覽與搜尋 log  
- 🕵️ 支援多服務 log 過濾與分類顯示  
- ☸️ K8s Dashboard API 日誌查看器，支援即時日誌串流  
- 📊 分析儀表板，提供圖表和統計數據  

---

## 🧩 系統架構

```text
+--------------------+
|   LocalStack AWS   |
| (CloudWatch Logs)  |
+---------+----------+
          |
          | awslocal logs filter-log-events
          v
+--------------------+
|  aws-log-reviewer  |
|  (Log Fetcher)     |
+---------+----------+
          |
          | JSON Log File
          v
+--------------------+
|   Web UI Viewer    |
+--------------------+
```

🧰 技術棧

Backend: LocalStack, AWS CLI (awslocal)

Frontend: React / Vite (可視化 UI)

Log Format: JSON-based Log Parsing

---

🧭 使用方式
1️⃣ 抓取 Log
使用 awslocal 從 LocalStack 擷取所有 CloudWatch 日誌並匯出為檔案：

```
awslocal logs filter-log-events ^
--log-group-name /aws/lambda/your-function ^
--limit 1000 > result/log/full-events-log.json
```
demo file in /data/full-events-log.json

2️⃣ 啟動 Log Review UI
啟動前端 UI，瀏覽日誌檔案內容：

```
npm i

npm run build

npm run start
```

啟動後，開啟瀏覽器並進入：
👉 http://localhost:3000

即可在 UI 中匯入的 full-events-log.json 檔案內容。

## 📄 可用頁面

應用程式包含以下頁面：

- **Overview（總覽）**: 儀表板總覽，顯示日誌統計和最新更新
- **Log Reviewer（日誌審查）**: 主要日誌查看介面，支援進階過濾和搜尋
- **API Log Viewer（API 日誌查看器）**: K8s Dashboard API 日誌查看器，支援即時串流、Namespace/Pod/Container 選擇和時間範圍過濾
- **K8s Deployments（K8s 部署）**: 查看 Kubernetes 部署、Pods 和容器日誌
- **Analytics（分析）**: 數據分析儀表板，提供圖表和統計數據
- **Version Log（版本日誌）**: 應用程式版本歷史和更新日誌

📸 範例截圖

![import-logs](./img/import-logs.png)

![dashboard](./img/dashboard1.png)

![dashboard](./img/dashboard2.png)

![log-reviewer](./img/log-reviewer.png)

![analytics](./img/analytics.png)

![version-log](./img/version-log.png)

![api-log-viewer](./img/api-log-viewer1.png)

![api-log-viewer](./img/api-log-viewer2.png)

![k8s-deployments](./img/k8s-admin-deployment.png)

![k8s-deployments](./img/k8s-admin-pod.png)