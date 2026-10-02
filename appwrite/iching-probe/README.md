# Appwrite 新加坡线路验证

## 2026-10-02：塔罗共用接口升级

新版 **1.2.0** 同时支持周易与塔罗；周易输入、接口地址、环境变量和限流保持兼容。Cloudflare 已升级，线上 Appwrite 目前仍是 1.1.0，需要在原函数 **Deployments → Create deployment → Manual** 上传 `dist/iching-appwrite-probe.tar.gz` 并激活。入口 `src/main.js`、构建 `npm install --omit=dev`、现有 Secret、`PUBLIC_AI_ENABLED=true`、Node.js 22、30 秒超时和 Firewall 全部沿用，**不要按下方早期试点步骤关闭当前公开接口**。

重新生成上传包：`node scripts/package.mjs`。新版 `/ai/health` 在原字段之外返回 `capabilities: ["iching", "tarot"]`。塔罗网页只会选择声明支持塔罗的服务，未升级的 Appwrite 继续提供周易服务。[塔罗实现说明](../../tarot/README.md)。下方 1.1.0 的部署记录保留作为历史验证。

最初版本用于验证大陆访问 Appwrite 与调用 Gemini。1.1.0 新增完整解卦和可选公开接口；**公开接口默认关闭**，必须通过完整解卦测试并配置入口限流后才启用。

项目 ID：`6abcac2100184edfa274`。已部署地址：`https://iching-probe.sgp.appwrite.run`。2026-09-30 用户提供的第二份检查记录（UTC 10:53）确认：地区 `sgp`、Gemini `gemini-3.5-flash-lite` 完整解卦耗时 3550ms、788 字、未截断；网络条件由用户记录为中国大陆且关闭 VPN/代理。`interpretationReady:false` 表示尚未开启公开接口，符合测试阶段预期。`countryCode:null` 表明此部署没有提供地区提示，不能据此宣称按大陆 IP 精确识别。入口检查相隔时间约 6 秒，前端选线等待已放宽至 10 秒。

**当前进度：升级步骤 1–5 已完成。公开 `/ai/health` 已返回 `ready:true`；正式 `/api/interpret` 实测返回 861 字、未截断、Gemini 耗时 4973ms，GitHub Pages 来源的 CORS 预检成功。四次空 JSON 检查中，第 4 次返回 429 且带 `X-Appwrite-WAF-Action: rateLimit`，确认平台限流生效；空 JSON 不调用 Gemini。网页按钮实测也已成功自动选线并显示解读（本次先连通的是 Cloudflare）。完整本地测试 107 项通过。部署包仍为已验证的 1.1.0 版本。**

## 已有函数升级：现在需要的操作

1. 保留函数 `iching-probe` 和现有的 `GEMINI_API_KEY`、`PROBE_TOKEN`，上传新的 `dist/iching-appwrite-probe.tar.gz` 并激活。入口仍为 `src/main.js`，构建命令仍为 `npm install --omit=dev`，Node.js 22、Timeout 30 秒、Execute access `Any`、API scopes 不授予权限。此时不要添加 `PUBLIC_AI_ENABLED`。
2. 如果旧检查页面还保留口令，先点击“复制口令”自行保存，再刷新检查页面并填回口令。依次检查入口，然后点击新增的“③ 测试完整解卦”。这个检查仅提交口令与空 JSON，服务器固定使用“面对新的合作机会，我应如何稳妥推进？”及节卦初爻变的完整提示词。不会发送你的个人问题。
3. 确认回答未截断、完整解读合理且用时在 23 秒以内，把“复制无密钥的检查记录”的结果发回。若超时或截断，先保持公开接口关闭。完整解卦比短语探针更能反映实际可用性。
4. 在项目 **Firewall → Create rule** 添加下面的入口限流。Scope 选 **Functions**，Resource 选 **iching-probe**；所有条件同时成立：**Path Equals `/api/interpret`**、**Method Equals `POST`**。Action 选 **Rate limit**；Request limit **3**，Interval **60 秒**，Limit by **IP address**，Strategy **Sliding window**，Priority **100**，Enabled 开启。若控制台没有 Firewall 或不支持这些项，先保持公开接口关闭并反馈实际选项。
5. 完整测试通过并配置限流后，添加普通环境变量 **`PUBLIC_AI_ENABLED=true`**，重新上传同一部署包并激活。`/ai/health` 返回 `ready:true` 才进入自动选线；回滚可把变量改为 `false` 并重新部署。API 密钥始终只放 Secret。
6. 本地前端代码已接入自动选线；GitHub Pages 仍须发布此次静态文件变更后才生效。先在本地页面实际解卦确认结果，再发布。旧版探针、未启用的正式接口或健康检查失败的接口会被跳过，Cloudflare 继续可用。

### 限流边界

Appwrite Free 提供 2 条 Firewall 规则。本部署只用一条按 IP 的入口限流；不要再叠加同路径的“总量”规则期待同时计数，因为 Firewall 在第一条匹配规则后停止。平台的入口限制跨函数实例执行；代码另加每实例每 IP 每分钟 3 次、每实例每分钟 20 次、每实例并发 2 次的辅助防护。这些不是全站每日费用硬上限，函数实例重启会清除实例内计数，平台限流故障时也可能放行。Gemini 项目额度仍需在 Google 控制台管理。

来源：[Firewall 免费规则数量](https://appwrite.io/docs/products/firewall/rules)、[限流参数及行为](https://appwrite.io/docs/products/firewall/actions)、[条件](https://appwrite.io/docs/products/firewall/conditions)、[规则顺序](https://appwrite.io/docs/products/firewall/priority)。

### 自动选线与时间限制

客户端点击 AI 解卦后并行检查 Cloudflare `/health` 与 Appwrite `/ai/health`，各最多 10 秒。选择时已收到 `CN` 地区提示且 Appwrite 已启用时优先新加坡；已收到其他有效地区提示时优先 Cloudflare，入口故障可选择另一条就绪线路。没有地区提示时采用先通过检查的线路，避免等待不可达的另一入口；两者同时就绪优先 Cloudflare。此策略不保证严格按访客国别分流。地区只反映网络出口，不代表访客真实所在位置；没有额外 IP 查询服务，不返回完整 IP，不保存地区信息。

只有连通性检查会访问两条线路。真正的问题只提交给选中的一条；生成请求提交后不自动跨线重试，防止重复生成和绕过限流。

Appwrite 同步 HTTP 上限 30 秒，完整解卦的 Gemini 请求限制为 23 秒，浏览器等待上限 35 秒。提示词、古籍资料、模型及 4096 token 输出上限与 Cloudflare 相同。测试失败时需要评估异步任务方案，不能仅把浏览器超时拉长。

## 1. 创建验证函数

在项目的 **Functions → Create function** 中创建函数：

| 设置 | 值 |
| --- | --- |
| 名称 | `iching-probe` |
| Runtime | Node.js 22（如果只提供更新版本，可选 Node.js 24） |
| Execute access | `Any`：浏览器能访问健康检查；Gemini 测试另需口令 |
| Entrypoint | `src/main.js` |
| Build commands | `npm install --omit=dev` |
| Timeout | 30 秒 |
| API scopes | 不授予任何权限；本函数不访问 Appwrite 数据库或管理 API |
| Events / Schedule | 不配置 |

函数同步 HTTP 请求有 30 秒上限；短语测试在 20 秒内终止，完整解卦在 23 秒内终止。公开接口按上面的升级步骤独立启用。

## 2. 配置环境变量

在函数的 Variables / Environment variables 页面添加：

| Key | Value | Secret |
| --- | --- | --- |
| `GEMINI_API_KEY` | 你现有的 Gemini API key，直接填入 Appwrite | 开启 |
| `PROBE_TOKEN` | 32–128 位字母、数字、短横线或下划线组成的随机测试口令 | 开启 |

打开本地检查页 `http://127.0.0.1:4173/iching/appwrite-check.html`，点击“生成测试口令”和“复制口令”，即可取得一个随机口令。复制到 Appwrite 后保持检查页打开，页面不持久化保存口令。不要把 Gemini key 填进检查页或聊天。

默认允许的浏览器来源为 `https://sparkmxy.github.io`、`http://127.0.0.1:4173` 和 `http://localhost:4173`。如确实需要其他来源，可添加 `ALLOWED_ORIGINS`（英文逗号分隔，必须包含协议和端口，不能有路径）。

模型固定使用现有 Cloudflare 已验证的 `gemini-3.5-flash-lite`。地区来自 Appwrite 注入的运行时变量，不需要自行设置 `APPWRITE_REGION`。

**环境变量变更后必须重新部署才生效。**

## 3. 上传部署包

部署包：`appwrite/iching-probe/dist/iching-appwrite-probe.tar.gz`。

在 **Deployments → Create deployment → Manual** 上传，入口填 `src/main.js`，勾选 **Activate deployment after build**。部署变成 Active 后，在 **Domains** 复制生成的 `https://你的函数.sgp.appwrite.run` 地址。

打包使用显式文件白名单，只包含 `package.json`、入口、解卦处理模块、共享提示词及公有领域经传数据，不包含 `.env`、API key、测试口令、现代译注或工具文件。打包时从 `iching/` 复制提示词和古籍，避免两条线路使用不同版本。

重新打包与测试（在仓库根目录执行）：

```powershell
node --test appwrite/iching-probe/tests/*.test.mjs iching/tests/appwrite-check.test.mjs
node appwrite/iching-probe/scripts/package.mjs
```

## 4. 分两段验证

如本地预览服务尚未启动，在仓库根目录执行 `node iching/serve.mjs`，然后访问本地检查页。

1. 先保留当前代理设置，填入函数地址，选择实际网络状态，点击“检查 Appwrite 入口”。此操作不调用 Gemini。
2. 显示新加坡地区且配置齐全后，填入测试口令，点击“检查 Gemini 调用”。函数只发送“请只回复：连接成功”这样的固定短句；一次检查只调用模型一次，无自动重试。
3. 切到中国大陆网络并关闭 VPN、系统代理、浏览器代理及 TUN（如有），修改检查页的网络选项，再依次检查两步。网页不能自动证明是否经过代理，选择项只是用户对测试条件的记录。
4. 点击“复制无密钥的检查记录”，把记录和函数地址发回聊天。记录包含地址、声明的网络条件、时间和检查结果，不含 API key、测试口令、访客 IP 或占卜问题。
5. 最好用家中宽带和手机流量各验证一次。单次成功只证明该时刻该网络可达，不等于所有大陆网络稳定可达。

`GET /health` 的 `ready: true` 只表示地区与变量配置正确。**只有 `POST /api/probe` 返回 `geminiVerified: true` 才证明实际调用 Gemini 成功。**

## 失败时看哪里

| 现象 | 检查项 |
| --- | --- |
| 无法访问，超时或 TLS 错误 | 测试当前网络及是否用了代理；不要仅凭一次错误认定被屏蔽 |
| Appwrite 401 / 404 / HTML 页面 | 函数是否 Active、Execute access 是否为 Any、是否复制了函数域名而非控制台 URL |
| `ready: false` | 地区是否 SGP、两个 Secret 是否已设置、设置后是否重新部署 |
| `invalid_probe_token` | 检查页口令是否与已部署的 PROBE_TOKEN 完全相同 |
| Gemini HTTP 400 / 401 / 403 / 404 | 检查 Gemini 密钥、模型权限及服务地区；函数不会返回上游原始错误或密钥 |
| `provider_quota` | Gemini 的频率或额度限制，稍后再试 |
| `provider_timeout` | Gemini 未在 20 秒内完成；正式解卦可能需要异步调用，暂不切换正式线路 |
| `probe_cooldown` | 等 30 秒再试；这是实例内节流，不是全局费用上限 |

测试口令仅用于 `/api/probe` 与 `/api/interpret-test`，不能写入正式前端配置。公开 `/api/interpret` 不使用测试口令，以域名检查、平台入口限流及实例内防护保护调用。Origin 是浏览器边界，不能当成鉴权。免费项目可能因闲置暂停，不能把休眠当作网络阻断。

参考：[Appwrite 部署](https://appwrite.io/docs/products/functions/deploy-manually)、[同步执行时限](https://appwrite.io/docs/products/functions/execute)、[环境变量](https://appwrite.io/docs/products/functions/environment-variables)、[默认域名](https://appwrite.io/docs/products/functions/domains)。
