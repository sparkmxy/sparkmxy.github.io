# 星镜 / Arcana

纯静态的中英双语塔罗网站，入口 `tarot/index.html`，无需构建，可由 GitHub Pages 托管。与周易共用原来的 Gemini 地址、密钥与限流额度。

## 功能

- 完整 78 张牌，韦特—史密斯顺序（力量 VIII、正义 XI）。矢量牌面和简要双语牌意均为原创，并非原版牌面复刻。
- 单牌、三牌、五牌，可手动选择或自动补齐，可启用正逆位。
- Web Crypto 安全随机数、拒绝采样和 Fisher–Yates 洗牌，不重复抽取；正逆位独立各 50%。安全随机源失败时停止，不降级为 `Math.random`。
- AI 结合实际牌位、正逆位、问题解读，输出语言随页面语言。仅在点击按钮时调用 Gemini。
- 牌面查询、本地日记（主动保存，最多 30 条）和 JSON 导出。日记与导出不含 AI 回答、API 密钥或 IP。
- 整体中英切换，记住手动选择。IP 出口为 CN/HK/TW/MO 时默认中文，其他地区英文；查询失败采用浏览器首选语言。

## 本机运行

仓库根目录：

```powershell
node iching/serve.mjs
node --test tarot/tests/*.test.mjs iching/tests/*.test.mjs appwrite/iching-probe/tests/*.test.mjs
```

访问 `http://127.0.0.1:4173/tarot/`。预览仅开放 `iching`、`tarot`、`divination` 三个目录。

## 共用接口

公开地址仍使用 `iching/ai-config.mjs`。塔罗请求：

```json
{"kind":"tarot","language":"zh","question":"我可以如何推进？","spread":"three","cards":[{"id":0,"reversed":false},{"id":17,"reversed":true},{"id":77,"reversed":false}]}
```

服务端校验 0–77 的牌 ID、数量、无重复、正逆位，由 `divination/prompt.mjs` 分流，根据服务器保存的牌意生成提示词。旧周易的 `{question, values}` 保持兼容。不接收前端自定义系统提示词。

新版健康接口包含 `capabilities: ["iching", "tarot"]`。塔罗跳过未升级的 Appwrite；旧部署仍可服务周易。已知大陆 IP 优先选择升级后的新加坡线路；未知地区先使用已连通线路。健康检查不调用 Gemini，每次点击最多发送一次生成请求，失败不自动换线路重发。

Cloudflare 已于 2026-10-02 升级。Appwrite 需要上传一次新版包：

```powershell
node appwrite/iching-probe/scripts/package.mjs
```

生成 `appwrite/iching-probe/dist/iching-appwrite-probe.tar.gz`。在 **原有函数**的 Deployments → Create deployment → Manual 上传，入口 `src/main.js`，构建 `npm install --omit=dev`，勾选构建后激活。Node.js 22、30 秒超时、Any 执行权限、现有 WAF、`PUBLIC_AI_ENABLED=true` 和 Secret 保持原设置。无需新地址、新项目、新密钥。新版 `/ai/health` 包含 `"tarot"` 后，网页自动恢复此线路。详见 [Appwrite 说明](../appwrite/iching-probe/README.md)。

## 地区与隐私

使用 [Country.is 官方 API](https://country.is/) 的 `GET https://api.country.is/`。请求不含问题、牌阵、凭据和来源路径，响应中的 IP 不使用、不保存，只保留当前页面使用的国家代码。VPN 出口会影响默认语言，手动选择优先，迟到的查询不会覆盖选择。查询失败不影响抽牌或语言按钮。

AI 回答以纯文本显示，不执行模型返回的 HTML。浏览器端没有 Gemini 密钥。上传包采用文件白名单，不含 `.env`、凭据、依赖或本地记录。
