# 静观 · Cloudflare Worker AI 解卦

2026-10-02 新增与 `tarot/` 共用的塔罗解读。`divination/prompt.mjs` 在服务端分流；旧周易 `{question, values}` 输入保持兼容，塔罗使用严格校验的 `{kind:"tarot", language, question, spread, cards}`。健康接口新增 `capabilities:["iching","tarot"]` 和 Cloudflare 提供的 `countryCode`。接口地址、密钥、CORS 和限流额度不变。[塔罗说明](../../tarot/README.md)。

网站继续托管在 GitHub Pages；本目录的 Worker 负责保存 Gemini 密钥、组装提示词和请求 Gemini。静态网页从不接触 Gemini 密钥。

当前 Worker 已部署到 `https://iching-ai.iching-ai-worker.workers.dev`，本地网页的接口地址已对应配置。2026-09-30 已确认 `GEMINI_API_KEY` Secret 存在，健康接口返回 200，真实 Gemini 测试约 4.6 秒返回完整中文解读。部署通过本机 HTTP 代理 `127.0.0.1:7890` 完成。密钥仅保存在 Cloudflare。

## 本机首次部署

部署包已经在本机准备好并通过 `wrangler deploy --dry-run`。下面的命令不会要求你把密钥发到聊天里。

1. 确认已经有 Cloudflare 账号及一个可以调用 Gemini API 的 Google AI Studio API Key。Worker 可以使用 Workers Free 计划，无需自定义域名。Gemini 额度和是否收费由 Google 账号及项目设置决定。
2. 在 PowerShell 中进入此目录。以下命令使用本机已经存在的 Node.js，不需要另装 npm：

   ```powershell
   Set-Location 'C:\Users\xinyu\OneDrive\sparkmxy.github.io\workers\iching-ai'
   $ichingNode = 'C:\Users\xinyu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
   & $ichingNode '.\node_modules\wrangler\bin\wrangler.js' login
   ```

   浏览器打开后，在 Cloudflare 完成登录和授权。

3. 回到同一 PowerShell 窗口部署：

   ```powershell
   & $ichingNode '.\node_modules\wrangler\bin\wrangler.js' deploy
   ```

   首次部署创建名为 `iching-ai` 的 Worker，并配置两个限流绑定。保存输出的 `https://iching-ai.<你的子域>.workers.dev` 地址。如果账号尚未设置 workers.dev 子域，按提示设置。此时尚无 Gemini 密钥，接口返回「服务尚未就绪」是正常状态。

4. 在 Cloudflare 控制台依次进入 **Workers & Pages → iching-ai → Settings → Variables and Secrets → Add**，选择 **Secret**：

   - 名称：`GEMINI_API_KEY`
   - 值：你自己的 Gemini API Key

   保存并部署。也可用 `& $ichingNode '.\node_modules\wrangler\bin\wrangler.js' secret put GEMINI_API_KEY`，在隐藏输入提示中粘贴密钥。不要把值写进源代码、`wrangler.jsonc`、GitHub 设置文件或聊天。

5. 打开 `https://iching-ai.<你的子域>.workers.dev/health`，应看到 `"ready":true`。这仅检查配置齐备，不会消耗 Gemini 调用额度，也不证明密钥和模型已获得 Google 授权。
6. 将 Worker 的公开地址发给维护者，或自行编辑 `iching/ai-config.mjs`：

   ```js
   export const AI_ENDPOINT = 'https://iching-ai.<你的子域>.workers.dev/api/interpret';
   ```

   把前端变更按仓库原有方式推送到 GitHub Pages。刷新页面，起一卦并点击「AI 解卦」作最终联网验证。不要把尖括号占位内容原样填入地址。

## 在其他电脑安装

使用 Node.js 22 或更高版本，在此目录运行 `pnpm install --frozen-lockfile`（也可以 `npm install`），再运行 `npx wrangler login`、`npx wrangler deploy`。`package.json` 固定了本次验证使用的 Wrangler 版本；限流绑定需要 Wrangler 4.36.0 及以上。Worker 打包会读取 `../../iching/ai-prompt.mjs` 和 `../../iching/hexagrams.mjs`，因此需要保留整个仓库的目录结构。

不要只把 `worker.mjs` 粘贴到控制台：它依赖共享卦象模块和两个限流绑定。Wrangler 会一并打包、配置。

## 配置与维护

`wrangler.jsonc` 中的配置均为公开、非秘密配置：

| 名称 | 当前值或用途 |
| --- | --- |
| `ALLOWED_ORIGINS` | 允许 `https://sparkmxy.github.io`、`http://127.0.0.1:4173`、`http://localhost:4173` 发起浏览器请求。以逗号分隔；只填协议与域名端口，不含 `/iching/` 或末尾 `/`。改域名时在此同步修改。 |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite`。模型可用性取决于 Google 项目；可改为账号可用的 Gemini 文本模型后重新部署。 |
| `AI_RATE_LIMITER` | 每 IP、每 Cloudflare 节点 60 秒最多 3 次。共享网络的访客共享这一额度。 |
| `AI_GLOBAL_LIMITER` | 每 Cloudflare 节点 60 秒最多 20 次。 |
| `namespace_id` | 本项目使用 `649301`、`649302`；同一账号已有其他项目使用时，改为未使用的正整数编号，避免共享计数器。 |

后续修改配置后重新运行 `deploy`；部署不会要求将已有 Secret 写回代码。控制台单独修改普通环境变量可能被下次本地部署覆盖，应以 `wrangler.jsonc` 为准。

Worker 只接受 `/api/interpret` 的 JSON POST，内容仅含 `question`（最多 200 字）和 `values`（6/7/8/9 的六元素数组，自下而上）。它限制请求体为 4096 字节，固定提示词及生成参数，生成上限为 4096 tokens，等待 Gemini 最长 55 秒，禁止重定向。上游请求使用 Workers 支持的 `redirect: 'manual'`，并拒绝所有 3xx 响应；不能使用 Node.js 支持而 Workers 不支持的 `redirect: 'error'`。Google 错误、密钥和内部异常不会原样返回浏览器，只返回 HTTP 状态码或固定错误类别用于排查。被安全策略阻止或没有正文的响应显示失败；达到输出上限的响应标明可能未结束。

跨域来源检查并不是用户身份认证，脚本可以伪造 Origin。Cloudflare 的限流计数在节点内执行且最终一致，不能充当精确的全球调用量或费用上限。本项目没有用户登录；当前措施用于限制匿名站点的频繁调用。如果以后面向较多公众开放，可以增加 Turnstile 或登录验证；同时在 Google 项目中管理 Gemini 配额。

本 Worker 不写数据库或缓存，不记录问题、解读或密钥；代码默认关闭 Workers Observability。Cloudflare 和 Google 仍按各自服务政策处理网络请求。Gemini 免费层的内容使用政策与付费层不同，可在官方价格页查看。不要把“Workers 免费”理解成“任何 Gemini 调用均免费”。

## 排错

### VPN / HTTP 代理导致部署连接失败

如果浏览器可以访问 Cloudflare，但 Wrangler 报 `A fetch request failed`，需要检查 Wrangler 是否使用了代理。本机已验证可用的 HTTP 代理是 `127.0.0.1:7890`。在执行 Wrangler 的同一个 PowerShell 窗口中先运行：

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:7890'
$env:HTTP_PROXY = 'http://127.0.0.1:7890'
& $ichingNode '.\node_modules\wrangler\bin\wrangler.js' whoami
& $ichingNode '.\node_modules\wrangler\bin\wrangler.js' deploy
```

`whoami` 能显示现有登录账号说明代理连接可用。HTTP 代理地址使用 `http://`，即使变量名是 `HTTPS_PROXY`。这两项设置只对当前 PowerShell 窗口及其启动的程序生效；新开窗口需重新设置。如果以后代理软件换了 HTTP 端口，应同步修改地址。无需修改 `wrangler.jsonc` 或 Worker 运行环境中的变量。

### 服务响应

- 提示「尚未开放」：前端 `AI_ENDPOINT` 仍为空。
- 提示「当前网站尚未获准」：检查 `ALLOWED_ORIGINS` 是否包含浏览器当前的完整 origin。
- `/health` 返回 503：检查 Secret、模型名称和两个限流绑定是否齐备。
- `/health` 就绪但解卦显示「尚未就绪」：检查 Google 密钥有效性、API 权限、模型可用性及 Google 服务可用地区；健康检查不会测试这些。
- 429：可能命中本站限流或 Google 配额，请稍后重试或检查 Google 项目额度。
- 超时/网络异常：原卦不会丢失，可以重试。停止等待会取消浏览器请求，但不保证 Google 已接受的生成停止或不计入用量。

## 本地验证

仓库根目录运行 `node --test iching/tests/*.test.mjs`。新增测试使用模拟 Google 响应，不使用真实 API Key，也不消耗 Gemini 额度。它们验证提示词、特殊用辞、跨域、限流、密钥隔离、超时、错误处理及前端切卦竞态。

本目录运行 `npm run test:runtime` 会先打包，再使用与 Wrangler 配套的 workerd 运行真实 Worker 代码，模拟 Google 响应，检查成功解读和拒绝重定向。它能发现普通 Node.js 测试无法发现的 Workers API 兼容性问题；所有出站请求在本机截获，不需要真实密钥。

在本目录运行 `npm run check` 或 `pnpm run check` 可只打包不部署。本地联调可运行 `npm run dev`，在本目录的 `.dev.vars` 中设置 `GEMINI_API_KEY`，临时把前端接口改为 `http://127.0.0.1:8787/api/interpret`；`.dev.vars` 已被 Git 忽略，联调完成后恢复线上地址。

## 官方参考

- [Cloudflare Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Rate Limiting bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Cloudflare Workers 定价](https://developers.cloudflare.com/workers/platform/pricing/)
- [Gemini generateContent API](https://ai.google.dev/api/generate-content)
- [Gemini 模型](https://ai.google.dev/gemini-api/docs/models)
- [Gemini 价格与免费层说明](https://ai.google.dev/gemini-api/docs/pricing)

官方文档核对日期：2026-09-30。实际账号额度、地区和可用模型以服务控制台为准。
